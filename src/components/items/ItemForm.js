import React, { useState, useEffect } from "react";
import "./ItemForm.css";

const ItemForm = ({ onAdd, editData }) => {

    const initialState = {
        name: "",
        warehouse: "",
        category_type: "",
        category: "",
        quantity: "",
        minThreshold: "5",
        currency: "INR",
        price: "",
        tax: "",
        total: "",
        supplier: "",
        code: "",
        status: "1",
        description: "",
        purchaseDate: "",
        imageUrl: "",
        fileAttachment: null,
        createdDate: Date.now(),
    };

    const [form, setForm] = useState(initialState);
    const [errors, setErrors] = useState({});
    const [fileError, setFileError] = useState("");

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFileError("");
        
        if (!file) {
            setForm((prev) => ({ ...prev, fileAttachment: null }));
            return;
        }

        // Limit file size to 1.5 MB
        if (file.size > 1.5 * 1024 * 1024) {
            setFileError("File is too large. Maximum size is 1.5 MB.");
            e.target.value = ""; // Clear file input
            setForm((prev) => ({ ...prev, fileAttachment: null }));
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setForm((prev) => ({
                ...prev,
                fileAttachment: {
                    base64: reader.result,
                    name: file.name,
                    type: file.type,
                }
            }));
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        if (editData) {
            setForm({ ...initialState, ...editData });
        } else {
            setForm(initialState);
        }
        setErrors({});
        setFileError("");
    }, [editData]);

    useEffect(() => {
        const quantity = Number(form.quantity) || 0;
        const price = Number(form.price) || 0;
        const tax = Number(form.tax) || 0;

        const total = (quantity * price) + tax;

        if (form.total !== total) {
            setForm((prev) => ({
                ...prev,
                total,
            }));
        }
    }, [form.quantity, form.price, form.tax]);

    // Validate form fields
    const validate = () => {
        const tempErrors = {};
        
        if (!form.name || !form.name.trim()) tempErrors.name = "Item Name is required.";
        if (!form.warehouse || !form.warehouse.trim()) tempErrors.warehouse = "Warehouse is required.";
        if (!form.category_type) tempErrors.category_type = "Category Type is required.";
        if (!form.category || !form.category.trim()) tempErrors.category = "Category is required.";
        
        if (form.quantity === "" || form.quantity === null || form.quantity === undefined) {
            tempErrors.quantity = "Quantity is required.";
        } else if (Number(form.quantity) < 0) {
            tempErrors.quantity = "Quantity cannot be negative.";
        }

        if (form.minThreshold !== "" && form.minThreshold !== null && form.minThreshold !== undefined) {
            if (Number(form.minThreshold) < 0) {
                tempErrors.minThreshold = "Threshold cannot be negative.";
            }
        }

        if (!form.currency) tempErrors.currency = "Currency is required.";

        if (form.price === "" || form.price === null || form.price === undefined) {
            tempErrors.price = "Price is required.";
        } else if (Number(form.price) < 0) {
            tempErrors.price = "Price cannot be negative.";
        }

        if (form.tax === "" || form.tax === null || form.tax === undefined) {
            tempErrors.tax = "Tax Amount is required.";
        } else if (Number(form.tax) < 0) {
            tempErrors.tax = "Tax cannot be negative.";
        }

        if (!form.supplier || !form.supplier.trim()) tempErrors.supplier = "Supplier Name is required.";
        if (!form.code || !form.code.trim()) tempErrors.code = "Item Code is required.";
        if (!form.status) tempErrors.status = "Status is required.";
        if (!form.purchaseDate) tempErrors.purchaseDate = "Purchase Date is required.";

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    // 🔹 Handle change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
        if (errors[name]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    // 🔹 Submit
    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onAdd(form);
        }
    };

    return (
        <div className="form-wrapper">
            <div className="form-card">
                <h4 className="form-title mb-3">
                    <i className={`bi ${editData ? "bi-pencil-square text-primary me-2" : "bi-plus-circle text-primary me-2"}`}></i>
                    {editData ? "Edit Item Details" : "Add Item Details"}
                </h4>

                <form onSubmit={handleSubmit} className="form-grid" noValidate>

                    <div className="form-group">
                        <label>Item Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Enter item name"
                            value={form.name}
                            onChange={handleChange}
                            className={errors.name ? "is-invalid" : ""}
                        />
                        {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                        <label>Warehouse</label>
                        <input
                            type="text"
                            name="warehouse"
                            placeholder="Enter warehouse"
                            value={form.warehouse}
                            onChange={handleChange}
                            className={errors.warehouse ? "is-invalid" : ""}
                        />
                        {errors.warehouse && <span className="error-text">{errors.warehouse}</span>}
                    </div>

                    <div className="form-group">
                        <label>Category Type</label>
                        <select
                            name="category_type"
                            value={form.category_type}
                            onChange={handleChange}
                            className={errors.category_type ? "is-invalid" : ""}
                        >
                            <option value=""> --Select Type-- </option>
                            <option value="Consumable">Consumable</option>
                            <option value="Non-Consumable">Non-Consumable</option>
                            <option value="Asset">Asset</option>
                            <option value="Non-Asset">Non-Asset</option>
                            <option value="Returnable">Returnable</option>
                            <option value="Non-Returnable">Non-Returnable</option>
                            <option value="Capital">Capital Item</option>
                            <option value="Revenue">Revenue Item</option>
                        </select>
                        {errors.category_type && <span className="error-text">{errors.category_type}</span>}
                    </div>

                    <div className="form-group">
                        <label>Category</label>
                        <input
                            type="text"
                            name="category"
                            placeholder="Enter category"
                            value={form.category}
                            onChange={handleChange}
                            className={errors.category ? "is-invalid" : ""}
                        />
                        {errors.category && <span className="error-text">{errors.category}</span>}
                    </div>

                    <div className="form-group">
                        <label>Quantity</label>
                        <input
                            type="number"
                            name="quantity"
                            placeholder="Enter quantity"
                            value={form.quantity}
                            onChange={handleChange}
                            className={errors.quantity ? "is-invalid" : ""}
                        />
                        {errors.quantity && <span className="error-text">{errors.quantity}</span>}
                    </div>

                    <div className="form-group">
                        <label>Low Stock Threshold</label>
                        <input
                            type="number"
                            name="minThreshold"
                            placeholder="Threshold (Default is 5)"
                            value={form.minThreshold}
                            onChange={handleChange}
                            className={errors.minThreshold ? "is-invalid" : ""}
                        />
                        {errors.minThreshold && <span className="error-text">{errors.minThreshold}</span>}
                    </div>

                    <div className="form-group">
                        <label>Currency</label>
                        <select
                            name="currency"
                            value={form.currency}
                            onChange={handleChange}
                            className={errors.currency ? "is-invalid" : ""}
                        >
                            <option value="INR">INR</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="JPY">JPY</option>
                            <option value="CNY">CNY</option>
                            <option value="AUD">AUD</option>
                            <option value="CAD">CAD</option>
                            <option value="CHF">CHF</option>
                            <option value="SEK">SEK</option>
                            <option value="NZD">NZD</option>
                        </select>
                        {errors.currency && <span className="error-text">{errors.currency}</span>}
                    </div>

                    <div className="form-group">
                        <label>Price</label>
                        <input
                            type="number"
                            name="price"
                            placeholder="Enter price"
                            value={form.price}
                            onChange={handleChange}
                            className={errors.price ? "is-invalid" : ""}
                        />
                        {errors.price && <span className="error-text">{errors.price}</span>}
                    </div>

                    <div className="form-group">
                        <label>Tax Amount</label>
                        <input
                            type="number"
                            name="tax"
                            placeholder="Enter tax amount"
                            value={form.tax}
                            onChange={handleChange}
                            className={errors.tax ? "is-invalid" : ""}
                        />
                        {errors.tax && <span className="error-text">{errors.tax}</span>}
                    </div>

                    <div className="form-group">
                        <label>Total Amount</label>
                        <input type="number" value={form.total} readOnly />
                    </div>

                    <div className="form-group">
                        <label>Supplier Name</label>
                        <input
                            type="text"
                            name="supplier"
                            placeholder="Enter supplier name"
                            value={form.supplier}
                            onChange={handleChange}
                            className={errors.supplier ? "is-invalid" : ""}
                        />
                        {errors.supplier && <span className="error-text">{errors.supplier}</span>}
                    </div>

                    <div className="form-group">
                        <label>Item Code</label>
                        <input
                            type="text"
                            name="code"
                            placeholder="Enter item code"
                            value={form.code}
                            onChange={handleChange}
                            className={errors.code ? "is-invalid" : ""}
                        />
                        {errors.code && <span className="error-text">{errors.code}</span>}
                    </div>

                    <div className="form-group">
                        <label>Status</label>
                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            className={errors.status ? "is-invalid" : ""}
                        >
                            <option value="1">Active</option>
                            <option value="0">Inactive</option>
                        </select>
                        {errors.status && <span className="error-text">{errors.status}</span>}
                    </div>

                    <div className="form-group">
                        <label>Purchase Date</label>
                        <input
                            type="date"
                            name="purchaseDate"
                            placeholder="Enter purchase date"
                            value={form.purchaseDate}
                            onChange={handleChange}
                            className={errors.purchaseDate ? "is-invalid" : ""}
                        />
                        {errors.purchaseDate && <span className="error-text">{errors.purchaseDate}</span>}
                    </div>

                    <div className="form-group">
                        <label>Created Date</label>
                        <input
                            type="date"
                            value={
                                form.createdDate
                                    ? new Date(form.createdDate).toISOString().split("T")[0]
                                    : ""
                            }
                            readOnly
                        />
                    </div>

                    <div className="form-group">
                        <label>Product Image URL (Optional)</label>
                        <input
                            type="text"
                            name="imageUrl"
                            placeholder="Enter image URL"
                            value={form.imageUrl || ""}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Upload Image / Invoice PDF (Max 1.5MB)</label>
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            className={fileError ? "is-invalid" : ""}
                        />
                        {fileError && <span className="error-text">{fileError}</span>}
                        {form.fileAttachment && (
                            <span className="text-success d-block mt-1" style={{ fontSize: '12.5px', fontWeight: '500' }}>
                                <i className="bi bi-file-earmark-check me-1"></i>
                                {form.fileAttachment.name} ({Math.round(form.fileAttachment.base64.length * 0.75 / 1024)} KB) attached
                            </span>
                        )}
                    </div>

                    <div className="form-group full-width">
                        <label>Description</label>
                        <textarea
                            name="description"
                            placeholder="Enter description"
                            value={form.description}
                            onChange={handleChange}
                        ></textarea>
                    </div>

                    <button type="submit" className="submit-btn">
                        {editData ? "Update Item" : "Save Item"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ItemForm;