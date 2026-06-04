import React, { useState, useEffect } from "react";
import "./ItemForm.css";

const ItemForm = ({ onAdd, editData }) => {

    const initialState = {
        name: "",
        warehouse: "",
        category_type: "",
        category: "",
        quantity: "",
        currency: "INR",
        price: "",
        tax: "",
        total: "",
        supplier: "",
        code: "",
        status: "1",
        description: "",
        purchaseDate: "",
        createdDate: Date.now(),
    };

    const [form, setForm] = useState(initialState);

    useEffect(() => {
        if (editData) {
            setForm({ ...initialState, ...editData });
        } else {
            setForm(initialState);
        }
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

    // 🔹 Handle change
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // 🔹 Submit
    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd(form);
    };

    return (
        <div className="form-wrapper">
            <div className="form-card">
                <h4 className="form-title mb-3">
                    <i className={`bi ${editData ? "bi-pencil-square text-primary me-2" : "bi-plus-circle text-primary me-2"}`}></i>
                    {editData ? "Edit Item Details" : "Add Item Details"}
                </h4>

                <form onSubmit={handleSubmit} className="form-grid">

                    <div className="form-group">
                        <label>Item Name</label>
                        <input type="text" name="name" placeholder="Enter item name" value={form.name} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Warehouse</label>
                        <input type="text" name="warehouse" placeholder="Enter warehouse" value={form.warehouse} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Category Type</label>
                        <select name="category_type" value={form.category_type} onChange={handleChange} required>
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
                    </div>

                    <div className="form-group">
                        <label>Category</label>
                        <input type="text" name="category" placeholder="Enter category" value={form.category} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Quantity</label>
                        <input type="number" name="quantity" placeholder="Enter quantity" value={form.quantity} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Currency</label>
                        <select name="currency" value={form.currency} onChange={handleChange} required>
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
                    </div>

                    <div className="form-group">
                        <label>Price</label>
                        <input type="number" name="price" placeholder="Enter price" value={form.price} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Tax Amount</label>
                        <input type="number" name="tax" placeholder="Enter tax amount" value={form.tax} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Total Amount</label>
                        <input type="number" value={form.total} readOnly />
                    </div>

                    <div className="form-group">
                        <label>Supplier Name</label>
                        <input type="text" name="supplier" placeholder="Enter supplier name" value={form.supplier} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Item Code</label>
                        <input type="text" name="code" placeholder="Enter item code" value={form.code} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Status</label>
                        <select name="status" value={form.status} onChange={handleChange} required>
                            <option value="1">Active</option>
                            <option value="0">Inactive</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Purchase Date</label>
                        <input type="date" name="purchaseDate" placeholder="Enter purchase date" value={form.purchaseDate} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Created Date</label>
                        {/* <input type="date" value={form.createdDate} readOnly /> */}
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

                    <div className="form-group full-width">
                        <label>Description</label>
                        <textarea name="description" placeholder="Enter description" value={form.description} onChange={handleChange}></textarea>
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