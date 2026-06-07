import React, { useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { getProductImage } from "../../services/imageService";
import "./ItemList.css";

const ItemList = ({ items, onView, onEdit, onDelete, openDeleteModal }) => {

    const [search, setSearch] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("");
    const [warehouseFilter, setWarehouseFilter] = React.useState("");
    const [activeDropdownId, setActiveDropdownId] = React.useState(null);
    const [showWarehouseDropdown, setShowWarehouseDropdown] = React.useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = React.useState(false);
    const warehouseRef = useRef(null);
    const statusRef = useRef(null);

    React.useEffect(() => {
        const handleOutsideClick = (e) => {
            // Don't dismiss action dropdown if the click is inside one
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

    const filteredItems = items.filter((item) => {
        const searchText = search.toLowerCase();

        const matchesSearch =
            item.name?.toLowerCase().includes(searchText) ||
            item.category?.toLowerCase().includes(searchText) ||
            item.supplier?.toLowerCase().includes(searchText) ||
            item.currency?.toLowerCase().includes(searchText) ||
            item.code?.toLowerCase().includes(searchText);

        const matchesStatus = statusFilter
            ? item.status === statusFilter
            : true;

        const matchesWarehouse = warehouseFilter
            ? (item.warehouse || '').trim() === warehouseFilter
            : true;

        return matchesSearch && matchesStatus && matchesWarehouse;
    });

    const handleExportExcel = () => {
        if (!items || items.length === 0) {
            alert("No data to export");
            return;
        }

        const exportData = items.map((item) => ({
            "Item Name": item.name,
            "Category": item.category,
            "Quantity": item.quantity,
            "Price (₹)": item.price,
            "Tax (₹)": item.tax,
            "Total (₹)": item.total,
            "Supplier": item.supplier,
            "Item Code": item.code,
            "Status": item.status === "1" ? "Active" : "Inactive",
            "Purchase Date": item.purchaseDate,
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

    return (
        <div className="list-container mt-5">

            {/* Filter bar OUTSIDE the scroll zone */}
            <div className="filter-bar">
                {/* 🔍 Search */}
                <input
                    type="text"
                    className="search-input py-2"
                    placeholder="Search item..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

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
            </div>

            <button className="export-btn fw-bold mb-2" onClick={handleExportExcel}>
                <i className="bi bi-file-earmark-spreadsheet"></i> Download in Excel
            </button>

            {/* Only the table itself is inside the horizontal scroll container */}
            <div className="table-wrapper">
                <table className="item-table table-responsive">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Item</th>
                            <th>Warehouse</th>
                            <th>Item Code</th>
                            <th>Type</th>
                            <th>Category</th>
                            <th>Qty</th>
                            <th>Currency</th>
                            <th>Price</th>
                            <th>Tax Amount</th>
                            <th>Total Amount</th>
                            <th>Purchase Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="no-data">
                                    No items found
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{index + 1}</td>

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
                                            <span>{item.quantity}</span>
                                            {Number(item.quantity) <= (Number(item.minThreshold) || 5) && (
                                                <span className="badge bg-danger text-white rounded-pill ms-1" style={{ fontSize: '10px', padding: '3px 6px' }} title={`Low stock: limit is ${item.minThreshold || 5}`}>
                                                    Low
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{item.currency}</td>
                                    <td>₹ {item.price}</td>
                                    <td>₹ {item.tax}</td>
                                    <td className="total">₹ {item.total}</td>
                                    <td>
                                        {item.purchaseDate
                                            ? new Date(item.purchaseDate).toLocaleDateString("en-GB")
                                            : "N/A"}
                                    </td>
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

                                    {/* <td>
                                        <div className="actions">
                                            <button
                                                className="btn view"
                                                onClick={() => onView(item)}
                                            >
                                                View
                                            </button>

                                            <button
                                                className="btn edit"
                                                onClick={() => onEdit(item)}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                className="btn delete"
                                                onClick={() => openDeleteModal(item)}
                                            >
                                                Delete
                                            </button>

                                        </div>
                                    </td> */}
                                    
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
                                                    <button type="button" className="dropdown-item view" onClick={() => onView(item)}>
                                                        <i className="bi bi-eye"></i> View
                                                    </button>

                                                    <button type="button" className="dropdown-item edit" onClick={() => onEdit(item)}>
                                                        <i className="bi bi-pencil"></i> Edit
                                                    </button>

                                                    <div className="dropdown-divider"></div>

                                                    <button type="button" className="dropdown-item delete" onClick={() => openDeleteModal(item)}>
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
        </div>
    );
};

export default ItemList;