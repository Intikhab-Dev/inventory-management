import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { transactionService } from "../../services/transactionService";
import "./StockLedger.css";
const renderReasonBadge = (reason) => {
    if (!reason) return <span className="reason-badge reason-default">—</span>;

    const lowerReason = reason.toLowerCase();
    
    // 1. Purchase Order Received
    if (lowerReason.includes("purchase order") || lowerReason.includes("po #")) {
        return (
            <span className="reason-badge reason-po">
                <i className="bi bi-cart-check-fill me-1"></i>
                {reason}
            </span>
        );
    }
    
    // 2. Sales Invoice Dispatched
    if (lowerReason.includes("sales invoice") || lowerReason.includes("invoice #")) {
        return (
            <span className="reason-badge reason-invoice">
                <i className="bi bi-receipt me-1"></i>
                {reason}
            </span>
        );
    }
    
    // 3. Initial Stock
    if (lowerReason.includes("initial stock")) {
        return (
            <span className="reason-badge reason-initial">
                <i className="bi bi-play-circle-fill me-1"></i>
                {reason}
            </span>
        );
    }
    
    // 4. Transfer OUT
    if (lowerReason.includes("transfer out")) {
        return (
            <span className="reason-badge reason-transfer-out">
                <i className="bi bi-arrow-left-right me-1"></i>
                {reason}
            </span>
        );
    }
    
    // 5. Transfer IN
    if (lowerReason.includes("transfer in")) {
        return (
            <span className="reason-badge reason-transfer-in">
                <i className="bi bi-arrow-left-right me-1"></i>
                {reason}
            </span>
        );
    }
    
    // 6. Manual Adjustment (Increase or Restock)
    if (lowerReason.includes("manual adjustment (increase)") || lowerReason.includes("restock")) {
        return (
            <span className="reason-badge reason-restock">
                <i className="bi bi-plus-circle-fill me-1"></i>
                {reason}
            </span>
        );
    }
    
    // 7. Manual Adjustment (Decrease or Dispatch / Sales)
    if (lowerReason.includes("manual adjustment (decrease)") || lowerReason.includes("dispatch") || lowerReason.includes("sales")) {
        return (
            <span className="reason-badge reason-dispatch">
                <i className="bi bi-dash-circle-fill me-1"></i>
                {reason}
            </span>
        );
    }
    
    // 8. Audit reconciliation
    if (lowerReason.includes("audit") || lowerReason.includes("reconciliation")) {
        return (
            <span className="reason-badge reason-audit">
                <i className="bi bi-clipboard-check-fill me-1"></i>
                {reason}
            </span>
        );
    }
    
    // Default fallback
    return (
        <span className="reason-badge reason-default">
            <i className="bi bi-arrow-right-short me-1"></i>
            {reason}
        </span>
    );
};

const StockLedger = ({ items = [] }) => {
    const [transactions, setTransactions] = useState([]);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState(""); // "" | "IN" | "OUT"
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [alertConfig, setAlertConfig] = useState(null);

    const showCustomAlert = (msg) => {
        return new Promise((resolve) => {
            setAlertConfig({
                message: msg,
                type: "alert",
                onConfirm: () => {
                    setAlertConfig(null);
                    resolve(true);
                }
            });
        });
    };

    const showCustomConfirm = (msg) => {
        return new Promise((resolve) => {
            setAlertConfig({
                message: msg,
                type: "confirm",
                onConfirm: () => {
                    setAlertConfig(null);
                    resolve(true);
                },
                onCancel: () => {
                    setAlertConfig(null);
                    resolve(false);
                }
            });
        });
    };

    // Load ledger logs on mount
    const fetchTransactions = () => {
        setTransactions(transactionService.getTransactions());
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    // ── Filter Log List ──
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesSearch =
                tx.itemName?.toLowerCase().includes(search.toLowerCase()) ||
                tx.itemId?.toLowerCase().includes(search.toLowerCase()) ||
                tx.reason?.toLowerCase().includes(search.toLowerCase()) ||
                tx.user?.toLowerCase().includes(search.toLowerCase());

            const matchesType = typeFilter ? tx.type === typeFilter : true;

            let matchesDate = true;
            if (dateFrom || dateTo) {
                const txDate = new Date(tx.timestamp);
                if (dateFrom) {
                    const fromLimit = new Date(dateFrom);
                    fromLimit.setHours(0, 0, 0, 0);
                    matchesDate = matchesDate && txDate >= fromLimit;
                }
                if (dateTo) {
                    const toLimit = new Date(dateTo);
                    toLimit.setHours(23, 59, 59, 999);
                    matchesDate = matchesDate && txDate <= toLimit;
                }
            }

            return matchesSearch && matchesType && matchesDate;
        });
    }, [transactions, search, typeFilter, dateFrom, dateTo]);

    // ── Clear Ledger Log ──
    const handleClearLedger = async () => {
        const confirmed = await showCustomConfirm("⚠️ Are you sure you want to clear all transaction logs? This action is permanent!");
        if (confirmed) {
            transactionService.clearTransactions();
            setTransactions([]);
        }
    };

    // ── Export Ledger to Excel ──
    const handleExportExcel = async () => {
        if (filteredTransactions.length === 0) {
            await showCustomAlert("No ledger data to export.");
            return;
        }

        const dataToExport = filteredTransactions.map((tx, idx) => ({
            "S.No.": idx + 1,
            "Timestamp": new Date(tx.timestamp).toLocaleString("en-IN"),
            "Item Code": tx.itemId,
            "Item Name": tx.itemName,
            "Type": tx.type === "IN" ? "IN (Stock In)" : "OUT (Stock Out)",
            "Quantity": tx.qty,
            "Unit (UoM)": items.find(i => i.code === tx.itemId)?.uom || "units",
            "Reason": tx.reason,
            "Operator": tx.user,
            "Notes": tx.notes || ""
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Ledger");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const file = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(file, `Stock_Ledger_${new Date().toISOString().split("T")[0]}.xlsx`);
    };

    return (
        <div className="ledger-page mt-5">
            {/* Header section */}
            <div className="ledger-header">
                <div>
                    <h2 className="ledger-title">
                        <i className="bi bi-clock-history text-primary me-2"></i>
                        Stock Ledger
                    </h2>
                    <p className="ledger-subtitle">Real-time audit log of all inward and outward inventory transactions.</p>
                </div>
                <div className="ledger-actions">
                    <button className="ledger-export-btn" onClick={handleExportExcel}>
                        <i className="bi bi-file-earmark-spreadsheet me-1"></i> Export Ledger
                    </button>
                    {transactions.length > 0 && (
                        <button className="ledger-clear-btn" onClick={handleClearLedger}>
                            <i className="bi bi-trash-fill me-1"></i> Clear Ledger
                        </button>
                    )}
                </div>
            </div>

            {/* Filter controls bar */}
            <div className="ledger-filter-bar">
                <div className="ledger-search-box">
                    <i className="bi bi-search search-icon"></i>
                    <input
                        type="text"
                        className="ledger-filter-input search"
                        placeholder="Search item name, code, user..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="ledger-filter-group">
                    <label>Type</label>
                    <select
                        className="ledger-filter-select"
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="IN">📥 Inward (Stock In)</option>
                        <option value="OUT">📤 Outward (Stock Out)</option>
                    </select>
                </div>

                <div className="ledger-filter-group">
                    <label>From</label>
                    <input
                        type="date"
                        className="ledger-filter-input date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        onClick={(e) => {
                            if (typeof e.target.showPicker === "function") {
                                try { e.target.showPicker(); } catch (err) {}
                            }
                        }}
                    />
                </div>

                <div className="ledger-filter-group">
                    <label>To</label>
                    <input
                        type="date"
                        className="ledger-filter-input date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        onClick={(e) => {
                            if (typeof e.target.showPicker === "function") {
                                try { e.target.showPicker(); } catch (err) {}
                            }
                        }}
                    />
                </div>

                {(search || typeFilter || dateFrom || dateTo) && (
                    <button
                        className="ledger-clear-filters"
                        onClick={() => {
                            setSearch("");
                            setTypeFilter("");
                            setDateFrom("");
                            setDateTo("");
                        }}
                    >
                        <i className="bi bi-x-circle me-1"></i> Clear Filters
                    </button>
                )}
            </div>

            {/* Table section */}
            <div className="ledger-table-wrapper card-box">
                {filteredTransactions.length === 0 ? (
                    <div className="ledger-empty">
                        <i className="bi bi-clock-history text-muted"></i>
                        <h5>No transactions match the current filters.</h5>
                        <p>Adjust your search filters or record some stock actions.</p>
                    </div>
                ) : (
                    <table className="ledger-table table-responsive">
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
                            {filteredTransactions.map(tx => (
                                <tr key={tx.id}>
                                    <td className="time-col">
                                        {new Date(tx.timestamp).toLocaleString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true
                                        })}
                                    </td>
                                    <td><code className="text-nowrap ledger-code-pill">{tx.itemId || "—"}</code></td>
                                    <td><strong className="ledger-item-name">{tx.itemName}</strong></td>
                                    <td>
                                        <span className={`text-nowrap ledger-badge ${tx.type === "IN" ? "lin" : "lout"}`}>
                                            {tx.type === "IN" ? "📥 INWARD" : "📤 OUTWARD"}
                                        </span>
                                    </td>
                                    <td className={`qty-col ${tx.type === "IN" ? "text-success" : "text-danger"}`}>
                                        <strong>{tx.type === "IN" ? "+" : "-"}{tx.qty}</strong> <small className="text-muted">{items.find(i => i.code === tx.itemId)?.uom || "units"}</small>
                                    </td>
                                    <td>
                                        {renderReasonBadge(tx.reason)}
                                    </td>
                                    <td className="operator-col">{tx.user}</td>
                                    <td className="notes-col">{tx.notes || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Custom Alert/Confirm Dialog Popup */}
            {alertConfig && (
                <div className="custom-alert-overlay no-print">
                    <div className="custom-alert-card animate-scale-up">
                        <div className="custom-alert-icon">
                            {alertConfig.type === "confirm" ? (
                                <i className="bi bi-exclamation-triangle-fill text-warning"></i>
                            ) : (
                                <i className="bi bi-info-circle-fill text-primary"></i>
                            )}
                        </div>
                        <div className="custom-alert-body">
                            <p className="custom-alert-message" style={{ whiteSpace: 'pre-wrap' }}>{alertConfig.message}</p>
                        </div>
                        <div className="custom-alert-actions">
                            {alertConfig.type === "confirm" ? (
                                <>
                                    <button
                                        type="button"
                                        className="alert-btn btn-cancel"
                                        onClick={alertConfig.onCancel}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="alert-btn btn-confirm"
                                        onClick={alertConfig.onConfirm}
                                    >
                                        Confirm
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className="alert-btn btn-ok"
                                    onClick={alertConfig.onConfirm}
                                >
                                    OK
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockLedger;
