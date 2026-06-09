import React, { useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { getProductImage } from "../../services/imageService";
import StockLogModal from "../common/StockLogModal";
import "./ItemList.css";

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

const ItemList = ({ items, onView, onEdit, onDelete, openDeleteModal, onDuplicate, onStockUpdate }) => {

    const [search, setSearch] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("");
    const [warehouseFilter, setWarehouseFilter] = React.useState("");
    const [activeDropdownId, setActiveDropdownId] = React.useState(null);
    const [showWarehouseDropdown, setShowWarehouseDropdown] = React.useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);

    // ── Column Sorting ──
    const [sortCol, setSortCol] = React.useState(null);
    const [sortDir, setSortDir] = React.useState("asc"); // "asc" | "desc"

    // ── Pagination ──
    const [currentPage, setCurrentPage] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(10);

    // ── Date Range Filter ──
    const [dateFrom, setDateFrom] = React.useState("");
    const [dateTo, setDateTo] = React.useState("");

    // ── Bulk Select ──
    const [selectedIds, setSelectedIds] = React.useState(new Set());
    const [showBulkConfirm, setShowBulkConfirm] = React.useState(false);

    // ── Stock Log Modal ──
    const [stockLogItem, setStockLogItem] = React.useState(null);

    const warehouseRef = useRef(null);
    const statusRef = useRef(null);

    React.useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!e.target.closest(".action-dropdown")) {
                setActiveDropdownId(null);
            }
            if (warehouseRef.current && !warehouseRef.current.contains(e.target)) {
                setShowWarehouseDropdown(false);
            }
            if (statusRef.current && !statusRef.current.contains(e.target)) {
                setShowStatusDropdown(false);
            }
        };
        window.addEventListener("mousedown", handleOutsideClick);
        return () => window.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    // Reset to page 1 whenever filters/search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter, warehouseFilter, dateFrom, dateTo, sortCol, sortDir, itemsPerPage]);

    const warehouses = React.useMemo(() => {
        const unique = new Set();
        items.forEach(item => {
            if (item.warehouse) {
                const w = item.warehouse.trim();
                if (w) unique.add(w);
            }
        });
        return [...unique].sort();
    }, [items]);

    // ── Filter ──
    const filteredItems = React.useMemo(() => {
        return items.filter((item) => {
            const searchText = search.toLowerCase();

            const matchesSearch =
                item.name?.toLowerCase().includes(searchText) ||
                item.category?.toLowerCase().includes(searchText) ||
                item.supplier?.toLowerCase().includes(searchText) ||
                item.currency?.toLowerCase().includes(searchText) ||
                item.code?.toLowerCase().includes(searchText);

            const matchesStatus = statusFilter ? item.status === statusFilter : true;

            const matchesWarehouse = warehouseFilter
                ? (item.warehouse || '').trim() === warehouseFilter
                : true;

            // Date range filter on purchaseDate
            let matchesDate = true;
            if (dateFrom || dateTo) {
                const pDate = item.purchaseDate ? new Date(item.purchaseDate) : null;
                if (!pDate) {
                    matchesDate = false;
                } else {
                    if (dateFrom) matchesDate = matchesDate && pDate >= new Date(dateFrom);
                    if (dateTo)   matchesDate = matchesDate && pDate <= new Date(dateTo);
                }
            }

            return matchesSearch && matchesStatus && matchesWarehouse && matchesDate;
        });
    }, [items, search, statusFilter, warehouseFilter, dateFrom, dateTo]);

    // ── Sort ──
    const sortedItems = React.useMemo(() => {
        if (!sortCol) return filteredItems;
        return [...filteredItems].sort((a, b) => {
            let aVal = a[sortCol] ?? "";
            let bVal = b[sortCol] ?? "";
            // Numeric columns
            if (["quantity", "price", "tax", "total"].includes(sortCol)) {
                aVal = Number(aVal) || 0;
                bVal = Number(bVal) || 0;
                return sortDir === "asc" ? aVal - bVal : bVal - aVal;
            }
            // Date column
            if (sortCol === "purchaseDate") {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
                return sortDir === "asc" ? aVal - bVal : bVal - aVal;
            }
            // String columns
            return sortDir === "asc"
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        });
    }, [filteredItems, sortCol, sortDir]);

    // ── Pagination ──
    const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage));
    const paginatedItems = sortedItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleSort = (col) => {
        if (sortCol === col) {
            setSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setSortCol(col);
            setSortDir("asc");
        }
    };

    const SortIcon = ({ col }) => {
        if (sortCol !== col) return <i className="bi bi-arrow-down-up sort-icon muted" />;
        return sortDir === "asc"
            ? <i className="bi bi-arrow-up sort-icon active-sort" />
            : <i className="bi bi-arrow-down sort-icon active-sort" />;
    };

    // ── Bulk select helpers ──
    const currentPageIds = paginatedItems.map(i => i.id);
    const allCurrentSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id));

    const toggleSelectAll = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allCurrentSelected) {
                currentPageIds.forEach(id => next.delete(id));
            } else {
                currentPageIds.forEach(id => next.add(id));
            }
            return next;
        });
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleBulkDelete = () => {
        selectedIds.forEach(id => onDelete && onDelete(id));
        setSelectedIds(new Set());
        setShowBulkConfirm(false);
    };


    // ── Excel Export ──
    const handleExportExcel = () => {
        if (!items || items.length === 0) {
            alert("No data to export");
            return;
        }

        const exportData = items.map((item) => ({
            "Item Name": item.name,
            "Category": item.category,
            "Quantity": item.quantity,
            "Unit": item.uom || "units",
            "Price (₹)": item.price,
            "Tax Slab": item.taxSlab || "GST 0%",
            "Tax (₹)": item.tax,
            "Total (₹)": item.total,
            "Supplier": item.supplier,
            "Item Code": item.code,
            "Status": item.status === "1" ? "Active" : "Inactive",
            "Purchase Date": item.purchaseDate,
            "Bill Number": item.billNumber || "—",
            "Bill Date": item.billDate || "—",
            "PO Number": item.poNumber || "—",
            "Created Date": item.createdDate
                ? new Date(Number(item.createdDate)).toLocaleDateString("en-GB")
                : "N/A",
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Items");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const file = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(file, "Item_Details.xlsx");
    };

    const columns = [
        { key: "name",         label: "Item" },
        { key: "warehouse",    label: "Warehouse" },
        { key: "code",         label: "Item Code" },
        { key: "category_type",label: "Type" },
        { key: "category",     label: "Category" },
        { key: "quantity",     label: "Qty" },
        // { key: "currency",     label: "Currency" },
        { key: "price",        label: "Price" },
        { key: "tax",          label: "Tax" },
        { key: "total",        label: "Total" },
        // { key: "purchaseDate", label: "Purchase Date" },
        { key: "status",       label: "Status" },
    ];

    return (
        <div className="list-container">
            {/* Header row with page-level actions */}
            <div className="list-header-row">
                <div className="list-header-left">
                    <h3 className="list-title">Inventory Catalog</h3>
                    <p className="list-subtitle">Manage, search, and track inventory stock items</p>
                </div>
                <div className="list-header-right">
                    <button className="export-btn fw-bold" onClick={handleExportExcel}>
                        <i className="bi bi-file-earmark-spreadsheet-fill"></i> Export Excel
                    </button>
                    <button className="add-item-btn" onClick={() => onEdit(null)}>
                        <i className="bi bi-plus-lg"></i> Add New Item
                    </button>
                </div>
            </div>

            {/* List Controls Panel Card */}
            <div className="list-controls-card">
                {/* ── Search & Filters Row ── */}
                <div className="filter-bar">
                    {/* 🔍 Search */}
                    <div className="search-wrapper">
                        <i className="bi bi-search search-icon"></i>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search items..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="filters-group">
                        {/* Date From */}
                        <div className="date-filter-group">
                            <label className="date-label">From</label>
                            <input
                                type="date"
                                className="date-input"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                onClick={(e) => {
                                    if (typeof e.target.showPicker === "function") {
                                        try { e.target.showPicker(); } catch (err) {}
                                    }
                                }}
                            />
                        </div>

                        {/* Date To */}
                        <div className="date-filter-group">
                            <label className="date-label">To</label>
                            <input
                                type="date"
                                className="date-input"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                onClick={(e) => {
                                    if (typeof e.target.showPicker === "function") {
                                        try { e.target.showPicker(); } catch (err) {}
                                    }
                                }}
                            />
                        </div>

                        {/* Warehouse Custom Dropdown */}
                        <div className="custom-dropdown-container" ref={warehouseRef}>
                            <button
                                className={`custom-dropdown-btn ${showWarehouseDropdown ? "active" : ""}`}
                                onClick={(e) => { e.stopPropagation(); setShowWarehouseDropdown(!showWarehouseDropdown); setShowStatusDropdown(false); }}
                            >
                                <i className="bi bi-building me-2 text-primary"></i>
                                <span>{warehouseFilter === "" ? "All Warehouses" : warehouseFilter}</span>
                                <i className={`bi bi-chevron-down ms-2 arrow-icon ${showWarehouseDropdown ? "rotate" : ""}`}></i>
                            </button>
                            {showWarehouseDropdown && (
                                <div className="custom-dropdown-list animate-slide-up">
                                    <div
                                        className={`custom-dropdown-item ${warehouseFilter === "" ? "selected" : ""}`}
                                        onClick={() => { setWarehouseFilter(""); setShowWarehouseDropdown(false); }}
                                    >All Warehouses</div>
                                    {warehouses.map((w) => (
                                        <div
                                            key={w}
                                            className={`custom-dropdown-item ${warehouseFilter === w ? "selected" : ""}`}
                                            onClick={() => { setWarehouseFilter(w); setShowWarehouseDropdown(false); }}
                                        >{w}</div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Status Custom Dropdown */}
                        <div className="custom-dropdown-container" ref={statusRef}>
                            <button
                                className={`custom-dropdown-btn ${showStatusDropdown ? "active" : ""}`}
                                onClick={(e) => { e.stopPropagation(); setShowStatusDropdown(!showStatusDropdown); setShowWarehouseDropdown(false); }}
                            >
                                <i className="bi bi-toggle-on me-2 text-primary"></i>
                                <span>
                                    {statusFilter === "" ? "All Status" : statusFilter === "1" ? "Active" : "Inactive"}
                                </span>
                                <i className={`bi bi-chevron-down ms-2 arrow-icon ${showStatusDropdown ? "rotate" : ""}`}></i>
                            </button>
                            {showStatusDropdown && (
                                <div className="custom-dropdown-list animate-slide-up">
                                    {[
                                        { value: "", label: "All Status" },
                                        { value: "1", label: "Active" },
                                        { value: "0", label: "Inactive" },
                                    ].map((opt) => (
                                        <div
                                            key={opt.value}
                                            className={`custom-dropdown-item ${statusFilter === opt.value ? "selected" : ""}`}
                                            onClick={() => { setStatusFilter(opt.value); setShowStatusDropdown(false); }}
                                        >{opt.label}</div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Clear filters button (show only when any filter is active) */}
                        {(search || statusFilter || warehouseFilter || dateFrom || dateTo) && (
                            <button
                                className="clear-filters-btn"
                                onClick={() => {
                                    setSearch(""); setStatusFilter(""); setWarehouseFilter("");
                                    setDateFrom(""); setDateTo("");
                                }}
                                title="Clear all filters"
                            >
                                <i className="bi bi-x-circle me-1"></i> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Toolbar Actions (Export / Selected Items) ── */}
                <div className="toolbar-row">
                    <div className="toolbar-left">
                        {selectedIds.size > 0 && (
                            <button className="bulk-delete-btn" onClick={() => setShowBulkConfirm(true)}>
                                <i className="bi bi-trash"></i> Delete Selected ({selectedIds.size})
                            </button>
                        )}
                    </div>

                    <div className="toolbar-right">
                        <span className="results-count">
                            Showing {paginatedItems.length} of {filteredItems.length} items
                        </span>
                        <label className="per-page-label">
                            Show&nbsp;
                            <select
                                className="per-page-select"
                                value={itemsPerPage}
                                onChange={e => setItemsPerPage(Number(e.target.value))}
                            >
                                {ITEMS_PER_PAGE_OPTIONS.map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                            &nbsp;per page
                        </label>
                    </div>
                </div>

                {/* ── Bulk Delete Confirmation ── */}
                {showBulkConfirm && (
                    <div className="bulk-confirm-bar mt-3">
                        <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                        <span>Delete <strong>{selectedIds.size}</strong> selected item{selectedIds.size > 1 ? "s" : ""}? This cannot be undone.</span>
                        <button className="bulk-confirm-yes ms-auto" onClick={handleBulkDelete}>Yes, Delete</button>
                        <button className="bulk-confirm-no" onClick={() => setShowBulkConfirm(false)}>Cancel</button>
                    </div>
                )}
            </div>

            {/* Only the table itself is inside the horizontal scroll container */}
            <div className="table-wrapper">
                <table className="item-table table-responsive">
                    <thead>
                        <tr>
                            <th className="th-checkbox">
                                <input
                                    type="checkbox"
                                    checked={allCurrentSelected}
                                    onChange={toggleSelectAll}
                                    title="Select all on this page"
                                />
                            </th>
                            <th>#</th>
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className="sortable-th"
                                    onClick={() => handleSort(col.key)}
                                >
                                    {col.label} <SortIcon col={col.key} />
                                </th>
                            ))}
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan="15" className="no-data">
                                    No items found
                                </td>
                            </tr>
                        ) : paginatedItems.length === 0 ? (
                            <tr>
                                <td colSpan="15" className="no-data">
                                    No items match the current filters
                                </td>
                            </tr>
                        ) : (
                            paginatedItems.map((item, index) => (
                                <tr key={item.id} className={selectedIds.has(item.id) ? "row-selected" : ""}>
                                    <td className="td-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => toggleSelectOne(item.id)}
                                        />
                                    </td>
                                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>

                                    <td>
                                        <div className="d-flex align-items-center gap-2">
                                            <img
                                                src={getProductImage(item)}
                                                alt={item.name}
                                                className="item-thumbnail"
                                            />
                                            <div className="item-name">{item.name}</div>
                                        </div>
                                    </td>

                                    <td>
                                        <div className="item-warehouse">{item.warehouse}</div>
                                    </td>

                                    <td>
                                        <div className="item-code">{item.code}</div>
                                    </td>

                                    <td>{item.category_type}</td>
                                    <td>{item.category}</td>
                                    <td>
                                        <div className="d-flex align-items-center justify-content-start gap-1">
                                            <span>
                                                {item.quantity} <small className="text-muted">{item.uom || "units"}</small>
                                            </span>
                                            {Number(item.quantity) <= (Number(item.minThreshold) || 5) && (
                                                <span className="badge bg-danger text-white rounded-pill ms-1" style={{ fontSize: '10px', padding: '3px 6px' }} title={`Low stock: limit is ${item.minThreshold || 5}`}>
                                                    Low
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    {/* <td>{item.currency}</td> */}
                                    <td>₹ {item.price}</td>
                                    <td>
                                        <div>₹ {item.tax}</div>
                                        {item.taxSlab && <small className="text-muted d-block" style={{ fontSize: '10px' }}>{item.taxSlab}</small>}
                                    </td>
                                    <td className="total">₹ {item.total}</td>
                                    {/* <td>
                                        {item.purchaseDate
                                            ? new Date(item.purchaseDate).toLocaleDateString("en-GB")
                                            : "N/A"}
                                    </td> */}
                                    <td>
                                        <span
                                            className={
                                                item.status === "1"
                                                    ? "status active"
                                                    : "status inactive"
                                            }
                                        >
                                            {item.status === "1" ? "Active" : "Inactive"}
                                        </span>
                                    </td>

                                    <td>
                                        <div className="action-dropdown">
                                            {/* Toggle Button (3 Dots Icon) */}
                                            <button
                                                type="button"
                                                className={`dropdown-toggle-btn ${activeDropdownId === item.id ? "active" : ""}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                                                }}
                                            >
                                                <i className="bi bi-three-dots-vertical"></i>
                                            </button>

                                            {/* Dropdown Menu List */}
                                            {activeDropdownId === item.id && (
                                                <div className="dropdown-menu-list">
                                                    <button type="button" className="dropdown-item view" onClick={() => { setActiveDropdownId(null); onView(item); }}>
                                                        <i className="bi bi-eye"></i> View
                                                    </button>

                                                    <button type="button" className="dropdown-item edit" onClick={() => { setActiveDropdownId(null); onEdit(item); }}>
                                                        <i className="bi bi-pencil"></i> Edit
                                                    </button>

                                                    {/* {onDuplicate && (
                                                        <button type="button" className="dropdown-item duplicate" onClick={() => { setActiveDropdownId(null); onDuplicate(item); }}>
                                                            <i className="bi bi-copy"></i> Duplicate
                                                        </button>
                                                    )} */}

                                                    {/* <button type="button" className="dropdown-item stock-log" onClick={() => { setActiveDropdownId(null); setStockLogItem(item); }}>
                                                        <i className="bi bi-arrow-left-right"></i> Stock Log
                                                    </button> */}

                                                    <div className="dropdown-divider"></div>

                                                    <button type="button" className="dropdown-item delete" onClick={() => { setActiveDropdownId(null); openDeleteModal(item); }}>
                                                        <i className="bi bi-trash"></i> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Stock Log Modal ── */}
            {stockLogItem && (
                <StockLogModal
                    item={stockLogItem}
                    onClose={() => setStockLogItem(null)}
                    onUpdateQty={(itemId, delta) => {
                        onStockUpdate && onStockUpdate(itemId, delta);
                        // Reflect updated qty in modal without re-querying
                        setStockLogItem(prev => prev ? { ...prev, quantity: Number(prev.quantity) + delta } : null);
                    }}
                />
            )}

            {/* ── Pagination Controls ── */}
            {totalPages > 1 && (
                <div className="pagination-bar">
                    <button
                        className="page-btn"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        title="First page"
                    >
                        <i className="bi bi-chevron-double-left"></i>
                    </button>
                    <button
                        className="page-btn"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <i className="bi bi-chevron-left"></i>
                    </button>

                    {/* Page number pills */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                        .reduce((acc, p, idx, arr) => {
                            if (idx > 0 && arr[idx - 1] !== p - 1) acc.push("...");
                            acc.push(p);
                            return acc;
                        }, [])
                        .map((p, idx) =>
                            p === "..." ? (
                                <span key={`ellipsis-${idx}`} className="page-ellipsis">…</span>
                            ) : (
                                <button
                                    key={p}
                                    className={`page-btn ${currentPage === p ? "active-page" : ""}`}
                                    onClick={() => setCurrentPage(p)}
                                >
                                    {p}
                                </button>
                            )
                        )
                    }

                    <button
                        className="page-btn"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        <i className="bi bi-chevron-right"></i>
                    </button>
                    <button
                        className="page-btn"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        title="Last page"
                    >
                        <i className="bi bi-chevron-double-right"></i>
                    </button>

                    <span className="page-info">
                        Page {currentPage} of {totalPages}
                    </span>
                </div>
            )}
        </div>
    );
};

export default ItemList;