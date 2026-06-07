import React, { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { transactionService } from "../../services/transactionService";
import "./Reports.css";

const Reports = ({ items = [] }) => {
    const [activeTab, setActiveTab] = useState("summary");
    const [transactions, setTransactions] = useState([]);
    const printRef = useRef(null);

    useEffect(() => {
        if (activeTab === "movements") {
            setTransactions(transactionService.getTransactions());
        }
    }, [activeTab]);

    /* ── Computed Stats ── */
    const stats = useMemo(() => {
        if (!items.length) return null;

        const totalItems    = items.length;
        const totalQty      = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
        const totalValue    = items.reduce((s, i) => s + Number(i.total    || 0), 0);
        const activeItems   = items.filter(i => i.status === "1").length;
        const lowStock      = items.filter(i => Number(i.quantity) <= (Number(i.minThreshold) || 5));
        const outOfStock    = items.filter(i => Number(i.quantity) === 0);

        // By Category
        const byCat = {};
        items.forEach(i => {
            const c = i.category || "Uncategorised";
            if (!byCat[c]) byCat[c] = { count: 0, qty: 0, value: 0 };
            byCat[c].count++;
            byCat[c].qty   += Number(i.quantity || 0);
            byCat[c].value += Number(i.total    || 0);
        });

        // By Warehouse
        const byWh = {};
        items.forEach(i => {
            const w = i.warehouse || "Unassigned";
            if (!byWh[w]) byWh[w] = { count: 0, qty: 0, value: 0 };
            byWh[w].count++;
            byWh[w].qty   += Number(i.quantity || 0);
            byWh[w].value += Number(i.total    || 0);
        });

        // By Supplier
        const bySupplier = {};
        items.forEach(i => {
            const s = i.supplier || "Unknown";
            if (!bySupplier[s]) bySupplier[s] = { count: 0, value: 0 };
            bySupplier[s].count++;
            bySupplier[s].value += Number(i.total || 0);
        });

        // Top 5 by value
        const topByValue = [...items]
            .sort((a, b) => Number(b.total) - Number(a.total))
            .slice(0, 5);

        // Monthly additions (last 6 months)
        const now = Date.now();
        const monthly = {};
        for (let m = 5; m >= 0; m--) {
            const d = new Date(now);
            d.setMonth(d.getMonth() - m);
            const key = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
            monthly[key] = 0;
        }
        items.forEach(i => {
            if (i.createdDate) {
                const d = new Date(Number(i.createdDate));
                const key = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
                if (monthly[key] !== undefined) monthly[key]++;
            }
        });

        return {
            totalItems, totalQty, totalValue, activeItems,
            lowStockCount: lowStock.length, outOfStockCount: outOfStock.length,
            byCat, byWh, bySupplier, topByValue, monthly,
        };
    }, [items]);

    /* ── Export ── */
    const exportExcel = () => {
        const wb = XLSX.utils.book_new();

        // Summary sheet
        const summaryData = stats ? [
            ["Metric", "Value"],
            ["Total Items", stats.totalItems],
            ["Total Quantity", stats.totalQty],
            ["Total Inventory Value (₹)", stats.totalValue.toFixed(2)],
            ["Active Items", stats.activeItems],
            ["Inactive Items", stats.totalItems - stats.activeItems],
            ["Low Stock Items", stats.lowStockCount],
            ["Out of Stock Items", stats.outOfStockCount],
        ] : [];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");

        // All items sheet
        const itemRows = [
            ["#", "Name", "Code", "Category", "Warehouse", "Supplier", "Qty", "Price (₹)", "Tax (₹)", "Total (₹)", "Status", "Purchase Date"],
            ...items.map((item, idx) => [
                idx + 1, item.name, item.code, item.category, item.warehouse,
                item.supplier, item.quantity, item.price, item.tax, item.total,
                item.status === "1" ? "Active" : "Inactive", item.purchaseDate,
            ])
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(itemRows), "All Items");

        // Category sheet
        if (stats) {
            const catRows = [
                ["Category", "Item Count", "Total Qty", "Total Value (₹)"],
                ...Object.entries(stats.byCat).map(([c, d]) => [c, d.count, d.qty, d.value.toFixed(2)])
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catRows), "By Category");

            const whRows = [
                ["Warehouse", "Item Count", "Total Qty", "Total Value (₹)"],
                ...Object.entries(stats.byWh).map(([w, d]) => [w, d.count, d.qty, d.value.toFixed(2)])
            ];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(whRows), "By Warehouse");
        }

        const blob = new Blob(
            [XLSX.write(wb, { bookType: "xlsx", type: "array" })],
            { type: "application/octet-stream" }
        );
        saveAs(blob, `Inventory_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
    };

    const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const fmtN = (n) => Number(n || 0).toLocaleString("en-IN");

    /* ── Bar helper ── */
    const maxVal = (obj, key) => Math.max(...Object.values(obj).map(v => v[key]), 1);

    if (!items.length) {
        return (
            <div className="reports-page mt-5">
                <div className="reports-empty">
                    <i className="bi bi-bar-chart-line"></i>
                    <h4>No Data Yet</h4>
                    <p>Add items to generate inventory reports.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reports-page mt-5" ref={printRef}>

            {/* ── Header ── */}
            <div className="reports-header">
                <div>
                    <h2 className="reports-title">
                        <i className="bi bi-file-earmark-bar-graph-fill text-primary me-2"></i>
                        Inventory Reports
                    </h2>
                    <p className="reports-subtitle">
                        Complete analysis as of {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                </div>
                <button className="report-export-btn" onClick={exportExcel}>
                    <i className="bi bi-file-earmark-spreadsheet me-1"></i> Export Full Report
                </button>
            </div>

            {/* ── KPI Cards ── */}
            {stats && (
                <div className="report-kpi-grid">
                    <div className="report-kpi blue">
                        <div className="rkpi-icon"><i className="bi bi-box-seam-fill"></i></div>
                        <div>
                            <div className="rkpi-val">{fmtN(stats.totalItems)}</div>
                            <div className="rkpi-label">Total Items</div>
                        </div>
                    </div>
                    <div className="report-kpi purple">
                        <div className="rkpi-icon"><i className="bi bi-currency-rupee"></i></div>
                        <div>
                            <div className="rkpi-val">₹{fmt(stats.totalValue)}</div>
                            <div className="rkpi-label">Inventory Value</div>
                        </div>
                    </div>
                    <div className="report-kpi green">
                        <div className="rkpi-icon"><i className="bi bi-check-circle-fill"></i></div>
                        <div>
                            <div className="rkpi-val">{fmtN(stats.activeItems)}</div>
                            <div className="rkpi-label">Active Items</div>
                        </div>
                    </div>
                    <div className="report-kpi orange">
                        <div className="rkpi-icon"><i className="bi bi-exclamation-triangle-fill"></i></div>
                        <div>
                            <div className="rkpi-val">{fmtN(stats.lowStockCount)}</div>
                            <div className="rkpi-label">Low Stock</div>
                        </div>
                    </div>
                    <div className="report-kpi red">
                        <div className="rkpi-icon"><i className="bi bi-x-circle-fill"></i></div>
                        <div>
                            <div className="rkpi-val">{fmtN(stats.outOfStockCount)}</div>
                            <div className="rkpi-label">Out of Stock</div>
                        </div>
                    </div>
                    <div className="report-kpi teal">
                        <div className="rkpi-icon"><i className="bi bi-stack"></i></div>
                        <div>
                            <div className="rkpi-val">{fmtN(stats.totalQty)}</div>
                            <div className="rkpi-label">Total Units</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="report-tabs">
                {[
                    { id: "summary",   label: "Summary",   icon: "bi-grid-3x3-gap-fill" },
                    { id: "category",  label: "By Category", icon: "bi-tags-fill" },
                    { id: "warehouse", label: "By Warehouse", icon: "bi-building-fill" },
                    { id: "supplier",  label: "By Supplier", icon: "bi-truck" },
                    { id: "items",     label: "All Items",  icon: "bi-table" },
                    { id: "movements", label: "Stock Ledger", icon: "bi-clock-history" },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`report-tab ${activeTab === tab.id ? "rtab-active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <i className={`bi ${tab.icon} me-1`}></i> {tab.label}
                    </button>
                ))}
            </div>

            {/* ──────── SUMMARY TAB ──────── */}
            {activeTab === "summary" && stats && (
                <div className="report-section">
                    <div className="report-two-col">
                        {/* Monthly Additions chart */}
                        <div className="report-card">
                            <h6 className="rcard-title">
                                <i className="bi bi-calendar3 text-primary me-2"></i>Monthly Item Additions
                            </h6>
                            <div className="bar-chart">
                                {Object.entries(stats.monthly).map(([month, count]) => (
                                    <div key={month} className="bar-group">
                                        <div className="bar-track">
                                            <div
                                                className="bar-fill"
                                                style={{ height: `${Math.round((count / Math.max(...Object.values(stats.monthly), 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="bar-count">{count}</div>
                                        <div className="bar-label">{month.split(" ")[0]}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top 5 by value */}
                        <div className="report-card">
                            <h6 className="rcard-title">
                                <i className="bi bi-trophy-fill text-primary me-2"></i>Top 5 Items by Value
                            </h6>
                            <div className="top-items-list">
                                {stats.topByValue.map((item, idx) => (
                                    <div key={item.id} className="top-item-row">
                                        <span className={`top-rank rank-${idx + 1}`}>{idx + 1}</span>
                                        <div className="top-item-info">
                                            <span className="top-item-name">{item.name}</span>
                                            <span className="top-item-cat">{item.category}</span>
                                        </div>
                                        <span className="top-item-val">₹{fmt(item.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ──────── CATEGORY TAB ──────── */}
            {activeTab === "category" && stats && (
                <div className="report-section">
                    <div className="report-card">
                        <h6 className="rcard-title">
                            <i className="bi bi-tags-fill text-primary me-2"></i>Inventory by Category
                        </h6>
                        <div className="report-table-wrapper">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Items</th>
                                        <th>Total Qty</th>
                                        <th>Total Value</th>
                                        <th>Share</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(stats.byCat)
                                        .sort((a, b) => b[1].value - a[1].value)
                                        .map(([cat, d]) => (
                                            <tr key={cat}>
                                                <td><span className="cat-pill">{cat}</span></td>
                                                <td>{d.count}</td>
                                                <td>{fmtN(d.qty)}</td>
                                                <td className="val-col">₹{fmt(d.value)}</td>
                                                <td>
                                                    <div className="share-bar-track">
                                                        <div className="share-bar-fill" style={{
                                                            width: `${Math.round((d.value / stats.totalValue) * 100)}%`
                                                        }} />
                                                    </div>
                                                    <span className="share-pct">
                                                        {((d.value / stats.totalValue) * 100).toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ──────── WAREHOUSE TAB ──────── */}
            {activeTab === "warehouse" && stats && (
                <div className="report-section">
                    <div className="report-card">
                        <h6 className="rcard-title">
                            <i className="bi bi-building-fill text-primary me-2"></i>Inventory by Warehouse
                        </h6>
                        <div className="wh-cards">
                            {Object.entries(stats.byWh)
                                .sort((a, b) => b[1].value - a[1].value)
                                .map(([wh, d], idx) => (
                                    <div key={wh} className="wh-stat-card">
                                        <div className="wh-rank">{idx + 1}</div>
                                        <div className="wh-info">
                                            <div className="wh-name"><i className="bi bi-building-fill text-primary me-2"></i>{wh}</div>
                                            <div className="wh-meta">{d.count} items · {fmtN(d.qty)} units</div>
                                        </div>
                                        <div className="wh-value">₹{fmt(d.value)}</div>
                                        <div className="wh-bar-col">
                                            <div className="share-bar-track">
                                                <div className="share-bar-fill wh-bar" style={{
                                                    width: `${Math.round((d.value / stats.totalValue) * 100)}%`
                                                }} />
                                            </div>
                                            <span className="share-pct">
                                                {((d.value / stats.totalValue) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* ──────── SUPPLIER TAB ──────── */}
            {activeTab === "supplier" && stats && (
                <div className="report-section">
                    <div className="report-card">
                        <h6 className="rcard-title">
                            <i className="bi bi-truck text-primary me-2"></i>Inventory by Supplier
                        </h6>
                        <div className="report-table-wrapper">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Supplier</th>
                                        <th>Items Supplied</th>
                                        <th>Total Value</th>
                                        <th>Value Share</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(stats.bySupplier)
                                        .sort((a, b) => b[1].value - a[1].value)
                                        .map(([sup, d], idx) => (
                                            <tr key={sup}>
                                                <td>{idx + 1}</td>
                                                <td><strong>{sup}</strong></td>
                                                <td>{d.count}</td>
                                                <td className="val-col">₹{fmt(d.value)}</td>
                                                <td>
                                                    <div className="share-bar-track">
                                                        <div className="share-bar-fill sup-bar" style={{
                                                            width: `${Math.round((d.value / stats.totalValue) * 100)}%`
                                                        }} />
                                                    </div>
                                                    <span className="share-pct">
                                                        {((d.value / stats.totalValue) * 100).toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ──────── ALL ITEMS TAB ──────── */}
            {activeTab === "items" && (
                <div className="report-section">
                    <div className="report-card">
                        <div className="rcard-title-row">
                            <h6 className="rcard-title">
                                <i className="bi bi-table text-primary me-2"></i>All Items ({items.length})
                            </h6>
                            <button className="rcard-export-btn" onClick={exportExcel}>
                                <i className="bi bi-download me-1"></i> Export
                            </button>
                        </div>
                        <div className="report-table-wrapper">
                            <table className="report-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Name</th>
                                        <th>Code</th>
                                        <th>Category</th>
                                        <th>Warehouse</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={item.id}>
                                            <td>{idx + 1}</td>
                                            <td><strong>{item.name}</strong></td>
                                            <td><code className="item-code-pill">{item.code || "—"}</code></td>
                                            <td>{item.category}</td>
                                            <td>{item.warehouse || "—"}</td>
                                            <td className={Number(item.quantity) === 0 ? "qty-zero" : ""}>{item.quantity}</td>
                                            <td>₹{fmt(item.price)}</td>
                                            <td className="val-col">₹{fmt(item.total)}</td>
                                            <td>
                                                <span className={`item-status-pill ${item.status === "1" ? "sactive" : "sinactive"}`}>
                                                    {item.status === "1" ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ──────── STOCK LEDGER TAB ──────── */}
            {activeTab === "movements" && (
                <div className="report-section">
                    <div className="report-card">
                        <div className="rcard-title-row">
                            <h6 className="rcard-title">
                                <i className="bi bi-clock-history text-primary me-2"></i>Stock Movement Ledger
                            </h6>
                            {transactions.length > 0 && (
                                <button className="rcard-export-btn btn-clear-ledger" onClick={() => {
                                    if (window.confirm("Are you sure you want to clear all transaction logs?")) {
                                        transactionService.clearTransactions();
                                        setTransactions([]);
                                    }
                                }}>
                                    <i className="bi bi-trash-fill me-1"></i> Clear Ledger
                                </button>
                            )}
                        </div>
                        <div className="report-table-wrapper">
                            {transactions.length === 0 ? (
                                <p className="text-muted text-center py-4">No stock movements logged yet. Adjust items or add stock to populate the ledger.</p>
                            ) : (
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>Item Code</th>
                                            <th>Item Name</th>
                                            <th>Type</th>
                                            <th>Quantity</th>
                                            <th>Reason</th>
                                            <th>Operator</th>
                                            <th>Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map(tx => (
                                            <tr key={tx.id}>
                                                <td style={{ whiteSpace: "nowrap" }}>
                                                    {new Date(tx.timestamp).toLocaleString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </td>
                                                <td><code className="item-code-pill">{tx.itemId || "—"}</code></td>
                                                <td><strong>{tx.itemName}</strong></td>
                                                <td>
                                                    <span className={`ledger-type-badge ${tx.type === "IN" ? "lin" : "lout"}`}>
                                                        {tx.type === "IN" ? "📥 IN" : "📤 OUT"}
                                                    </span>
                                                </td>
                                                <td className={tx.type === "IN" ? "text-success fw-bold" : "text-danger fw-bold"}>
                                                    {tx.type === "IN" ? "+" : "-"}{tx.qty}
                                                </td>
                                                <td>
                                                    <span className="ledger-reason-pill">{tx.reason}</span>
                                                </td>
                                                <td>{tx.user}</td>
                                                <td className="report-notes-col" style={{ fontSize: "12.5px" }}>{tx.notes || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
