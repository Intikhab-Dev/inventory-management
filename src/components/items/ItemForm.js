import React, { useState, useEffect } from "react";
import "./ItemForm.css";

// Read master lists from Settings (saved in localStorage)
const STORAGE_KEY_CAT = "customCategories";
const STORAGE_KEY_WH  = "customWarehouses";
const STORAGE_KEY_SUP = "suppliers";

const DEFAULT_CATEGORIES = ["Electronics", "Furniture", "Stationery", "Tools", "Clothing", "Food", "Medical", "Other"];
const DEFAULT_WAREHOUSES  = ["Main Warehouse", "Secondary Warehouse", "Cold Storage"];
const DEFAULT_SUPPLIERS = [
    { id: 1, name: "ABC Traders", status: "active" },
    { id: 2, name: "XYZ Solutions", status: "active" },
    { id: 3, name: "Global Exports", status: "active" }
];

const loadList = (key, defaults) => {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        return Array.isArray(saved) && saved.length > 0 ? saved : defaults;
    } catch { return defaults; }
};

// Reusable field component
const Field = ({ label, name, type = "text", placeholder, required, readOnly, form, handleChange, errors, children }) => (
    <div className="form-group">
        <label className="form-label">
            {label} {required && <span className="required-star">*</span>}
        </label>
        {children || (
            <input
                type={type}
                name={name}
                placeholder={placeholder}
                value={form[name] ?? ""}
                onChange={handleChange}
                readOnly={readOnly}
                className={`form-input ${errors[name] ? "is-invalid" : ""} ${readOnly ? "readonly-input" : ""}`}
            />
        )}
        {errors[name] && <span className="error-text"><i className="bi bi-exclamation-circle me-1"></i>{errors[name]}</span>}
    </div>
);

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
    const [categories, setCategories] = useState([]);
    const [warehouses, setWarehouses]  = useState([]);
    const [suppliers, setSuppliers]   = useState([]);

    // Load master lists on mount
    useEffect(() => {
        setCategories(loadList(STORAGE_KEY_CAT, DEFAULT_CATEGORIES));
        setWarehouses(loadList(STORAGE_KEY_WH,  DEFAULT_WAREHOUSES));
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SUP));
            setSuppliers(Array.isArray(saved) && saved.length > 0 ? saved : DEFAULT_SUPPLIERS);
        } catch {
            setSuppliers(DEFAULT_SUPPLIERS);
        }
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFileError("");

        if (!file) {
            setForm((prev) => ({ ...prev, fileAttachment: null }));
            return;
        }

        if (file.size > 1.5 * 1024 * 1024) {
            setFileError("File is too large. Maximum size is 1.5 MB.");
            e.target.value = "";
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
        const price    = Number(form.price)    || 0;
        const tax      = Number(form.tax)      || 0;
        const total    = (quantity * price) + tax;

        if (form.total !== total) {
            setForm((prev) => ({ ...prev, total }));
        }
    }, [form.quantity, form.price, form.tax]);

    const generateItemCode = () => {
        const rand = Math.floor(100000 + Math.random() * 900000);
        return `ITM-${rand}`;
    };

    const validate = (formObj = form) => {
        const tempErrors = {};

        if (!formObj.name || !formObj.name.trim())           tempErrors.name          = "Item Name is required.";
        if (!formObj.warehouse || !formObj.warehouse.trim())  tempErrors.warehouse     = "Warehouse is required.";
        if (!formObj.category_type)                        tempErrors.category_type = "Category Type is required.";
        if (!formObj.category || !formObj.category.trim())    tempErrors.category      = "Category is required.";

        if (formObj.quantity === "" || formObj.quantity === null || formObj.quantity === undefined) {
            tempErrors.quantity = "Quantity is required.";
        } else if (Number(formObj.quantity) < 0) {
            tempErrors.quantity = "Quantity cannot be negative.";
        }

        if (formObj.minThreshold !== "" && formObj.minThreshold !== null && formObj.minThreshold !== undefined) {
            if (Number(formObj.minThreshold) < 0) tempErrors.minThreshold = "Threshold cannot be negative.";
        }

        if (!formObj.currency)                             tempErrors.currency  = "Currency is required.";

        if (formObj.price === "" || formObj.price === null || formObj.price === undefined) {
            tempErrors.price = "Price is required.";
        } else if (Number(formObj.price) < 0) {
            tempErrors.price = "Price cannot be negative.";
        }

        if (formObj.tax === "" || formObj.tax === null || formObj.tax === undefined) {
            tempErrors.tax = "Tax Amount is required.";
        } else if (Number(formObj.tax) < 0) {
            tempErrors.tax = "Tax cannot be negative.";
        }

        if (!formObj.supplier || !formObj.supplier.trim())    tempErrors.supplier     = "Supplier Name is required.";
        if (!formObj.code || !formObj.code.trim())            tempErrors.code         = "Item Code is required.";
        if (!formObj.status)                               tempErrors.status       = "Status is required.";
        if (!formObj.purchaseDate)                         tempErrors.purchaseDate = "Purchase Date is required.";

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

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

    const handleSubmit = (e) => {
        e.preventDefault();
        const generatedCode = form.code || generateItemCode();
        const updatedForm = { ...form, code: generatedCode };
        if (validate(updatedForm)) {
            onAdd(updatedForm);
        }
    };



    return (
        <div className="form-wrapper">
            <div className="form-card">

                {/* ── Card Header ── */}
                <div className="form-card-header">
                    <div className="form-card-icon">
                        <i className={`bi ${editData ? "bi-pencil-square" : "bi-plus-lg"}`}></i>
                    </div>
                    <div>
                        <h4 className="form-title">{editData ? "Edit Item" : "Add New Item"}</h4>
                        <p className="form-subtitle">
                            {editData ? "Update the details below and save changes." : "Fill in the details to add a new inventory item."}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="form-grid" noValidate>

                    {/* ══ SECTION: Basic Info ══ */}
                    <div className="form-section-label full-width">
                        <i className="bi bi-info-circle text-primary me-2"></i> Basic Information
                    </div>

                    <Field label="Item Name" name="name" placeholder="e.g. Office Chair" required form={form} handleChange={handleChange} errors={errors} />

                    {/* Warehouse — from master list */}
                    <div className="form-group">
                        <label className="form-label">
                            Warehouse <span className="required-star">*</span>
                        </label>
                        <select
                            name="warehouse"
                            value={form.warehouse}
                            onChange={handleChange}
                            className={`form-input ${errors.warehouse ? "is-invalid" : ""}`}
                        >
                            <option value="">-- Select Warehouse --</option>
                            {warehouses.map(w => (
                                <option key={w} value={w}>{w}</option>
                            ))}
                        </select>
                        {errors.warehouse && <span className="error-text"><i className="bi bi-exclamation-circle me-1"></i>{errors.warehouse}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Category Type <span className="required-star">*</span>
                        </label>
                        <select
                            name="category_type"
                            value={form.category_type}
                            onChange={handleChange}
                            className={`form-input ${errors.category_type ? "is-invalid" : ""}`}
                        >
                            <option value="">-- Select Type --</option>
                            <option value="Consumable">Consumable</option>
                            <option value="Non-Consumable">Non-Consumable</option>
                            <option value="Asset">Asset</option>
                            <option value="Non-Asset">Non-Asset</option>
                            <option value="Returnable">Returnable</option>
                            <option value="Non-Returnable">Non-Returnable</option>
                            <option value="Capital">Capital Item</option>
                            <option value="Revenue">Revenue Item</option>
                        </select>
                        {errors.category_type && <span className="error-text"><i className="bi bi-exclamation-circle me-1"></i>{errors.category_type}</span>}
                    </div>

                    {/* Category — from master list */}
                    <div className="form-group">
                        <label className="form-label">
                            Category <span className="required-star">*</span>
                        </label>
                        <select
                            name="category"
                            value={form.category}
                            onChange={handleChange}
                            className={`form-input ${errors.category ? "is-invalid" : ""}`}
                        >
                            <option value="">-- Select Category --</option>
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        {errors.category && <span className="error-text"><i className="bi bi-exclamation-circle me-1"></i>{errors.category}</span>}
                    </div>


                    {/* Supplier — from master list */}
                    <div className="form-group">
                        <label className="form-label">
                            Supplier Name <span className="required-star">*</span>
                        </label>
                        <select
                            name="supplier"
                            value={form.supplier}
                            onChange={handleChange}
                            className={`form-input ${errors.supplier ? "is-invalid" : ""}`}
                        >
                            <option value="">-- Select Supplier --</option>
                            {suppliers.map(s => (
                                <option key={s.id || s.name} value={s.name}>{s.name} {s.city ? `(${s.city})` : ""}</option>
                            ))}
                            {form.supplier && !suppliers.some(s => s.name === form.supplier) && (
                                <option value={form.supplier}>{form.supplier}</option>
                            )}
                        </select>
                        {errors.supplier && <span className="error-text"><i className="bi bi-exclamation-circle me-1"></i>{errors.supplier}</span>}
                    </div>

                    {/* ══ SECTION: Stock & Pricing ══ */}
                    <div className="form-section-label full-width">
                        <i className="bi bi-box-seam text-primary me-2"></i> Stock & Pricing
                    </div>

                    <Field label="Quantity" name="quantity" type="number" placeholder="0" required form={form} handleChange={handleChange} errors={errors} />
                    <Field label="Low Stock Threshold" name="minThreshold" type="number" placeholder="5 (default)" form={form} handleChange={handleChange} errors={errors} />

                    <div className="form-group">
                        <label className="form-label">
                            Currency <span className="required-star">*</span>
                        </label>
                        <select
                            name="currency"
                            value={form.currency}
                            onChange={handleChange}
                            className={`form-input ${errors.currency ? "is-invalid" : ""}`}
                        >
                            <option value="INR">INR — Indian Rupee</option>
                            <option value="USD">USD — US Dollar</option>
                            <option value="EUR">EUR — Euro</option>
                            <option value="GBP">GBP — British Pound</option>
                            <option value="JPY">JPY — Japanese Yen</option>
                            <option value="CNY">CNY — Chinese Yuan</option>
                            <option value="AUD">AUD — Australian Dollar</option>
                            <option value="CAD">CAD — Canadian Dollar</option>
                            <option value="CHF">CHF — Swiss Franc</option>
                            <option value="SEK">SEK — Swedish Krona</option>
                            <option value="NZD">NZD — New Zealand Dollar</option>
                        </select>
                        {errors.currency && <span className="error-text"><i className="bi bi-exclamation-circle me-1"></i>{errors.currency}</span>}
                    </div>

                    <Field label="Price (per unit)" name="price" type="number" placeholder="0.00" required form={form} handleChange={handleChange} errors={errors} />
                    <Field label="Tax Amount" name="tax" type="number" placeholder="0.00" required form={form} handleChange={handleChange} errors={errors} />

                    {/* Total — auto calculated */}
                    <div className="form-group">
                        <label className="form-label">Total Amount <span className="calc-badge">Auto</span></label>
                        <div className="total-display">
                            <i className="bi bi-currency-rupee total-icon"></i>
                            <span className="total-value">{Number(form.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* ══ SECTION: Status & Dates ══ */}
                    <div className="form-section-label full-width">
                        <i className="bi bi-calendar3 text-primary me-2"></i> Status & Dates
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Status <span className="required-star">*</span>
                        </label>
                        <div className="status-toggle-group">
                            <button
                                type="button"
                                className={`status-toggle-btn ${form.status === "1" ? "active-status" : ""}`}
                                onClick={() => { setForm(f => ({ ...f, status: "1" })); setErrors(e => { const n={...e}; delete n.status; return n; }); }}
                            >
                                <i className="bi bi-check-circle-fill me-1"></i> Active
                            </button>
                            <button
                                type="button"
                                className={`status-toggle-btn inactive ${form.status === "0" ? "active-inactive" : ""}`}
                                onClick={() => { setForm(f => ({ ...f, status: "0" })); setErrors(e => { const n={...e}; delete n.status; return n; }); }}
                            >
                                <i className="bi bi-x-circle-fill me-1"></i> Inactive
                            </button>
                        </div>
                        {errors.status && <span className="error-text"><i className="bi bi-exclamation-circle me-1"></i>{errors.status}</span>}
                    </div>

                    <Field label="Purchase Date" name="purchaseDate" type="date" required form={form} handleChange={handleChange} errors={errors} />

                    <div className="form-group">
                        <label className="form-label">Created Date</label>
                        <input
                            type="date"
                            value={form.createdDate ? new Date(form.createdDate).toISOString().split("T")[0] : ""}
                            readOnly
                            className="form-input readonly-input"
                        />
                    </div>

                    {/* ══ SECTION: Media & Notes ══ */}
                    <div className="form-section-label full-width">
                        <i className="bi bi-image text-primary me-2"></i> Media & Notes
                    </div>

                    <Field label="Product Image URL (Optional)" name="imageUrl" placeholder="https://example.com/image.jpg" form={form} handleChange={handleChange} errors={errors} />

                    <div className="form-group">
                        <label className="form-label">Upload Image / Invoice PDF <span className="size-hint">(Max 1.5 MB)</span></label>
                        <label className="file-upload-label">
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleFileChange}
                                className={fileError ? "is-invalid" : ""}
                                style={{ display: "none" }}
                            />
                            <i className="bi bi-cloud-upload-fill me-2 text-primary"></i>
                            {form.fileAttachment
                                ? form.fileAttachment.name
                                : "Click to upload file"}
                        </label>
                        {fileError && <span className="error-text"><i className="bi bi-exclamation-circle me-1"></i>{fileError}</span>}
                        {form.fileAttachment && (
                            <span className="file-attached-info">
                                <i className="bi bi-file-earmark-check-fill text-success me-1"></i>
                                {form.fileAttachment.name} ({Math.round(form.fileAttachment.base64.length * 0.75 / 1024)} KB)
                            </span>
                        )}
                    </div>

                    <div className="form-group full-width">
                        <label className="form-label">Description</label>
                        <textarea
                            name="description"
                            placeholder="Enter item description, notes, or any additional details…"
                            value={form.description}
                            onChange={handleChange}
                            className="form-input form-textarea"
                        />
                    </div>

                    {/* ══ Submit ══ */}
                    <button type="submit" className="submit-btn">
                        <i className={`bi ${editData ? "bi-check-lg" : "bi-plus-lg"} me-2`}></i>
                        {editData ? "Save Changes" : "Add Item"}
                    </button>

                </form>
            </div>
        </div>
    );
};

export default ItemForm;