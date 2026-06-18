import React, { useState } from "react";
import "./SupplierManagement.css";
import SupplierViewModal from "./SupplierViewModal";

const STORAGE_KEY = "suppliers";

const loadSuppliers = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) ? saved : [];
    } catch { return []; }
};

const saveSuppliers = (list) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

const emptyForm = {
    name: "", contactPerson: "", phone: "", email: "",
    gst: "", address: "", city: "", notes: "", status: "active",
};

const SupplierManagement = ({ items = [] }) => {
    const [suppliers, setSuppliers]   = useState(loadSuppliers);
    const [showForm, setShowForm]     = useState(false);
    const [editId, setEditId]         = useState(null);
    const [form, setForm]             = useState(emptyForm);
    const [errors, setErrors]         = useState({});
    const [search, setSearch]         = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [viewingSupplier, setViewingSupplier] = useState(null);

    // Item count per supplier
    const itemCountMap = React.useMemo(() => {
        const map = {};
        items.forEach(item => {
            const s = (item.supplier || "").trim();
            if (s) map[s] = (map[s] || 0) + 1;
        });
        return map;
    }, [items]);

    const validate = () => {
        const e = {};
        if (!form.name.trim())    e.name  = "Supplier name is required.";
        if (!form.phone.trim())   e.phone = "Phone is required.";
        if (!form.city.trim())    e.city  = "City is required.";
        if (!form.address.trim()) e.address = "Address is required.";
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            e.email = "Invalid email address.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
        if (errors[name]) setErrors(prev => { const n = {...prev}; delete n[name]; return n; });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;
        let updated;
        if (editId) {
            updated = suppliers.map(s => s.id === editId ? { ...s, ...form } : s);
        } else {
            updated = [...suppliers, { ...form, id: Date.now(), createdAt: Date.now() }];
        }
        setSuppliers(updated);
        saveSuppliers(updated);
        resetForm();
    };

    const resetForm = () => {
        setForm(emptyForm);
        setEditId(null);
        setShowForm(false);
        setErrors({});
    };

    const handleEdit = (s) => {
        setForm({ name: s.name, contactPerson: s.contactPerson || "", phone: s.phone || "",
            email: s.email || "", gst: s.gst || "", address: s.address || "",
            city: s.city || "", notes: s.notes || "", status: s.status || "active" });
        setEditId(s.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = (id) => {
        const updated = suppliers.filter(s => s.id !== id);
        setSuppliers(updated);
        saveSuppliers(updated);
        setDeleteTarget(null);
    };

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.contactPerson || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.city || "").toLowerCase().includes(search.toLowerCase())
    );

    const activeCount   = suppliers.filter(s => s.status === "active").length;
    const inactiveCount = suppliers.filter(s => s.status !== "active").length;

    return (
        <div className="supplier-page mt-5">

            {/* ── Page Header ── */}
            <div className="supplier-page-header">
                <div>
                    <h2 className="supplier-title">
                        <i className="bi bi-truck text-primary me-2"></i>
                        Supplier Management
                    </h2>
                    <p className="supplier-subtitle">Manage your suppliers and vendor contacts.</p>
                </div>
                <button className="add-supplier-btn" onClick={() => { resetForm(); setShowForm(true); }}>
                    <i className="bi bi-plus-lg me-1"></i> Add Supplier
                </button>
            </div>

            {/* ── KPI Row ── */}
            <div className="supplier-kpi-row">
                <div className="supplier-kpi">
                    <span className="skpi-num">{suppliers.length}</span>
                    <span className="skpi-label">Total Suppliers</span>
                </div>
                <div className="supplier-kpi active">
                    <span className="skpi-num">{activeCount}</span>
                    <span className="skpi-label">Active</span>
                </div>
                <div className="supplier-kpi inactive">
                    <span className="skpi-num">{inactiveCount}</span>
                    <span className="skpi-label">Inactive</span>
                </div>
                <div className="supplier-kpi items-kpi">
                    <span className="skpi-num">{Object.values(itemCountMap).reduce((a, b) => a + b, 0)}</span>
                    <span className="skpi-label">Total Items Linked</span>
                </div>
            </div>

            {/* ── Add / Edit Form ── */}
            {showForm && (
                <div className="supplier-form-card animate-fade-in">
                    <div className="supplier-form-header">
                        <h5>{editId ? "✏️ Edit Supplier" : "➕ New Supplier"}</h5>
                        <button className="sform-close" onClick={resetForm}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="supplier-form-grid" noValidate>
                        {/* Name */}
                        <div className="sform-group">
                            <label>Supplier Name <span className="req">*</span></label>
                            <input name="name" value={form.name} onChange={handleChange}
                                placeholder="e.g. ABC Traders"
                                className={`sform-input ${errors.name ? "sinvalid" : ""}`} />
                            {errors.name && <span className="serror">{errors.name}</span>}
                        </div>

                        <div className="sform-group">
                            <label>Contact Person</label>
                            <input name="contactPerson" value={form.contactPerson} onChange={handleChange}
                                placeholder="e.g. Ramesh Kumar" className="sform-input" />
                        </div>

                        <div className="sform-group">
                            <label>Phone <span className="req">*</span></label>
                            <input name="phone" value={form.phone} onChange={handleChange}
                                placeholder="+91 98765 43210"
                                className={`sform-input ${errors.phone ? "sinvalid" : ""}`} />
                            {errors.phone && <span className="serror">{errors.phone}</span>}
                        </div>

                        <div className="sform-group">
                            <label>Email</label>
                            <input name="email" value={form.email} onChange={handleChange}
                                placeholder="supplier@example.com"
                                className={`sform-input ${errors.email ? "sinvalid" : ""}`} />
                            {errors.email && <span className="serror">{errors.email}</span>}
                        </div>

                        <div className="sform-group">
                            <label>GST Number</label>
                            <input name="gst" value={form.gst} onChange={handleChange}
                                placeholder="e.g. 27AAPFU0939F1ZV" className="sform-input" />
                        </div>

                        <div className="sform-group">
                            <label>City <span className="req">*</span></label>
                            <input name="city" value={form.city} onChange={handleChange}
                                placeholder="e.g. Mumbai"
                                className={`sform-input ${errors.city ? "sinvalid" : ""}`} />
                            {errors.city && <span className="serror">{errors.city}</span>}
                        </div>

                        <div className="sform-group sfull">
                            <label>Address <span className="req">*</span></label>
                            <input name="address" value={form.address} onChange={handleChange}
                                placeholder="Street, Area, City"
                                className={`sform-input ${errors.address ? "sinvalid" : ""}`} />
                            {errors.address && <span className="serror">{errors.address}</span>}
                        </div>

                        <div className="sform-group">
                            <label>Status</label>
                            <div className="s-status-toggle">
                                <button type="button"
                                    className={`s-status-btn ${form.status === "active" ? "s-active" : ""}`}
                                    onClick={() => setForm(f => ({ ...f, status: "active" }))}>
                                    <i className="bi bi-check-circle-fill me-1"></i> Active
                                </button>
                                <button type="button"
                                    className={`s-status-btn ${form.status === "inactive" ? "s-inactive" : ""}`}
                                    onClick={() => setForm(f => ({ ...f, status: "inactive" }))}>
                                    <i className="bi bi-x-circle-fill me-1"></i> Inactive
                                </button>
                            </div>
                        </div>

                        <div className="sform-group sfull">
                            <label>Notes</label>
                            <textarea name="notes" value={form.notes} onChange={handleChange}
                                placeholder="Any additional information…"
                                className="sform-input sform-textarea" />
                        </div>

                        <div className="sform-actions sfull">
                            <button type="button" className="sform-cancel" onClick={resetForm}>Cancel</button>
                            <button type="submit" className="sform-submit">
                                <i className={`bi ${editId ? "bi-check-lg" : "bi-plus-lg"} me-1`}></i>
                                {editId ? "Save Changes" : "Add Supplier"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Search ── */}
            <div className="supplier-search-row">
                <div className="supplier-search-box">
                    <i className="bi bi-search supplier-search-icon"></i>
                    <input
                        type="text"
                        placeholder="Search by name, contact, city…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="supplier-search-input"
                    />
                    {search && <button className="supplier-search-clear" onClick={() => setSearch("")}>
                        <i className="bi bi-x"></i>
                    </button>}
                </div>
                <span className="supplier-count-text">{filtered.length} supplier{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {/* ── Cards Grid ── */}
            {filtered.length === 0 ? (
                <div className="supplier-empty">
                    <i className="bi bi-truck text-muted"></i>
                    <h5>{search ? "No suppliers match your search." : "No suppliers added yet."}</h5>
                    <p>Click <strong>Add Supplier</strong> to get started.</p>
                </div>
            ) : (
                <div className="supplier-cards-grid">
                    {filtered.map(s => {
                        const itemCount = itemCountMap[s.name] || 0;
                        return (
                            <div 
                                key={s.id} 
                                className={`supplier-card ${s.status !== "active" ? "s-card-inactive" : ""}`}
                                onClick={(e) => {
                                    if (
                                        e.target.closest(".scard-footer") || 
                                        e.target.closest(".scard-link") || 
                                        e.target.tagName.toLowerCase() === "a" || 
                                        e.target.closest("a")
                                    ) {
                                        return;
                                    }
                                    setViewingSupplier(s);
                                }}
                                style={{ cursor: "pointer" }}
                            >
                                {/* Card Header */}
                                <div className="scard-header">
                                    <div className="scard-avatar">
                                        {s.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="scard-info">
                                        <div className="scard-name">{s.name}</div>
                                        {s.city && <div className="scard-city">
                                            <i className="bi bi-geo-alt-fill me-1"></i>{s.city}
                                        </div>}
                                    </div>
                                    <span className={`scard-status ${s.status === "active" ? "s-badge-active" : "s-badge-inactive"}`}>
                                        {s.status === "active" ? "Active" : "Inactive"}
                                    </span>
                                </div>

                                {/* Card Details */}
                                <div className="scard-details">
                                    {s.contactPerson && (
                                        <div className="scard-row">
                                            <i className="bi bi-person-fill"></i>
                                            <span>{s.contactPerson}</span>
                                        </div>
                                    )}
                                    {s.phone && (
                                        <div className="scard-row">
                                            <i className="bi bi-telephone-fill"></i>
                                            <a href={`tel:${s.phone}`} className="scard-link">{s.phone}</a>
                                        </div>
                                    )}
                                    {s.email && (
                                        <div className="scard-row">
                                            <i className="bi bi-envelope-fill"></i>
                                            <a href={`mailto:${s.email}`} className="scard-link">{s.email}</a>
                                        </div>
                                    )}
                                    {s.gst && (
                                        <div className="scard-row">
                                            <i className="bi bi-file-earmark-text-fill"></i>
                                            <span className="scard-gst">{s.gst}</span>
                                        </div>
                                    )}
                                    {s.address && (
                                        <div className="scard-row">
                                            <i className="bi bi-house-fill"></i>
                                            <span>{s.address}</span>
                                        </div>
                                    )}
                                    {s.notes && (
                                        <div className="scard-notes">{s.notes}</div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="scard-footer">
                                    <span className="scard-items-count">
                                        <i className="bi bi-box-seam me-1"></i>
                                        {itemCount} item{itemCount !== 1 ? "s" : ""} linked
                                    </span>
                                    <div className="scard-actions">
                                        <button className="scard-edit" onClick={() => handleEdit(s)}>
                                            <i className="bi bi-pencil-fill"></i>
                                        </button>
                                        <button className="scard-delete" onClick={() => setDeleteTarget(s)}>
                                            <i className="bi bi-trash-fill"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Delete Confirm ── */}
            {deleteTarget && (
                <div className="supplier-confirm-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="supplier-confirm-box" onClick={e => e.stopPropagation()}>
                        <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: 32 }}></i>
                        <h5>Delete Supplier?</h5>
                        <p>Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone.</p>
                        <div className="sconfirm-actions">
                            <button className="sconfirm-cancel" onClick={() => setDeleteTarget(null)}>Cancel</button>
                            <button className="sconfirm-delete" onClick={() => handleDelete(deleteTarget.id)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Supplier View Modal ── */}
            <SupplierViewModal
                show={!!viewingSupplier}
                onClose={() => setViewingSupplier(null)}
                supplier={viewingSupplier}
                items={items}
            />
        </div>
    );
};

export default SupplierManagement;
