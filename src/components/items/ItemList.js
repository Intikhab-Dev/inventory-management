import React from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./ItemList.css";

const ItemList = ({ items, onView, onEdit, onDelete, openDeleteModal }) => {

    const [search, setSearch] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("");

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

        return matchesSearch && matchesStatus;
    });

    const handleExportExcel = () => {
        if (!items || items.length === 0) {
            alert("No data to export");
            return;
        }

        // 🔹 Data format (clean columns)
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

        // 🔹 Sheet create
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // 🔹 Workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Items");

        // 🔹 Buffer
        const excelBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array",
        });

        // 🔹 Save file
        const file = new Blob([excelBuffer], {
            type: "application/octet-stream",
        });

        saveAs(file, "Item_Details.xlsx");
    };

    return (
        <div className="list-container mt-5">
            {/* <div className="list-header">
                <h2>Stock Details</h2>
                <span className="count">Total: {items.length}</span>
            </div> */}

            <div className="table-wrapper">
                <div className="filter-bar float-end w-50">
                    {/* 🔍 Search */}
                    <input
                        type="text"
                        className="search-input py-2"
                        placeholder="Search item..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All</option>
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                    </select>
                </div>

                <button className="export-btn fw-bold" onClick={handleExportExcel}>
                    <i className="bi bi-file-earmark-spreadsheet"></i> Download in Excel
                </button>

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
                                        <div className="item-name">{item.name}</div>
                                    </td>

                                    <td>
                                        <div className="item-warehouse">{item.warehouse}</div>
                                    </td>

                                    <td>
                                        <div className="item-code">{item.code}</div>
                                    </td>

                                    <td>{item.category_type}</td>
                                    <td>{item.category}</td>
                                    <td>{item.quantity}</td>
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
                                            <button type="button" className="dropdown-toggle-btn">
                                                <i className="bi bi-three-dots-vertical"></i>
                                            </button>

                                            {/* Dropdown Menu List */}
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