import React, { useState, useEffect } from "react";
import "./Settings.css";

const STORAGE_KEY_CAT = "customCategories";
const STORAGE_KEY_WH  = "customWarehouses";

const loadList = (key, defaults) => {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        return Array.isArray(saved) ? saved : defaults;
    } catch {
        return defaults;
    }
};

const DEFAULT_CATEGORIES = ["Electronics", "Furniture", "Stationery", "Tools", "Clothing", "Food", "Medical", "Other"];
const DEFAULT_WAREHOUSES  = ["Main Warehouse", "Secondary Warehouse", "Cold Storage"];

const Settings = () => {
    const [categories, setCategories] = useState(() => loadList(STORAGE_KEY_CAT, DEFAULT_CATEGORIES));
    const [warehouses, setWarehouses]  = useState(() => loadList(STORAGE_KEY_WH,  DEFAULT_WAREHOUSES));

    const [newCat, setNewCat] = useState("");
    const [newWh,  setNewWh]  = useState("");
    const [catError, setCatError] = useState("");
    const [whError,  setWhError]  = useState("");
    const [savedMsg, setSavedMsg] = useState("");

    const flash = (msg) => {
        setSavedMsg(msg);
        setTimeout(() => setSavedMsg(""), 2500);
    };

    // Persist on change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_CAT, JSON.stringify(categories));
    }, [categories]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_WH, JSON.stringify(warehouses));
    }, [warehouses]);

    // ── Category actions ──
    const addCategory = () => {
        const val = newCat.trim();
        if (!val) { setCatError("Category name cannot be empty."); return; }
        if (categories.map(c => c.toLowerCase()).includes(val.toLowerCase())) {
            setCatError("Category already exists."); return;
        }
        setCategories(prev => [...prev, val]);
        setNewCat("");
        setCatError("");
        flash("Category added ✓");
    };

    const deleteCategory = (cat) => {
        setCategories(prev => prev.filter(c => c !== cat));
        flash("Category removed ✓");
    };

    // ── Warehouse actions ──
    const addWarehouse = () => {
        const val = newWh.trim();
        if (!val) { setWhError("Warehouse name cannot be empty."); return; }
        if (warehouses.map(w => w.toLowerCase()).includes(val.toLowerCase())) {
            setWhError("Warehouse already exists."); return;
        }
        setWarehouses(prev => [...prev, val]);
        setNewWh("");
        setWhError("");
        flash("Warehouse added ✓");
    };

    const deleteWarehouse = (wh) => {
        setWarehouses(prev => prev.filter(w => w !== wh));
        flash("Warehouse removed ✓");
    };

    const handleKeyDown = (e, action) => {
        if (e.key === "Enter") { e.preventDefault(); action(); }
    };

    return (
        <div className="settings-page mt-5">
            <div className="settings-header">
                <h2 className="settings-title">
                    <i className="bi bi-gear-fill text-primary me-2"></i>
                    Settings
                </h2>
                <p className="settings-subtitle">Manage categories and warehouses used across the system.</p>
            </div>

            {savedMsg && (
                <div className="settings-flash animate-fade-in">
                    <i className="bi bi-check-circle-fill me-2 text-success"></i> {savedMsg}
                </div>
            )}

            <div className="settings-grid">

                {/* ── CATEGORIES ── */}
                <div className="settings-card">
                    <div className="settings-card-header">
                        <i className="bi bi-tags-fill text-primary me-2"></i>
                        <h5>Categories</h5>
                        <span className="settings-count">{categories.length}</span>
                    </div>

                    <div className="settings-add-row">
                        <input
                            type="text"
                            className={`settings-input ${catError ? "is-invalid" : ""}`}
                            placeholder="New category name…"
                            value={newCat}
                            onChange={e => { setNewCat(e.target.value); setCatError(""); }}
                            onKeyDown={e => handleKeyDown(e, addCategory)}
                        />
                        <button className="settings-add-btn" onClick={addCategory}>
                            <i className="bi bi-plus-lg"></i> Add
                        </button>
                    </div>
                    {catError && <span className="settings-error">{catError}</span>}

                    <div className="settings-list">
                        {categories.length === 0 ? (
                            <div className="settings-empty">No categories yet.</div>
                        ) : (
                            categories.map(cat => (
                                <div key={cat} className="settings-list-item">
                                    <i className="bi bi-tag text-primary me-2"></i>
                                    <span>{cat}</span>
                                    <button
                                        className="settings-delete-btn"
                                        onClick={() => deleteCategory(cat)}
                                        title="Remove category"
                                    >
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── WAREHOUSES ── */}
                <div className="settings-card">
                    <div className="settings-card-header">
                        <i className="bi bi-building-fill text-primary me-2"></i>
                        <h5>Warehouses</h5>
                        <span className="settings-count">{warehouses.length}</span>
                    </div>

                    <div className="settings-add-row">
                        <input
                            type="text"
                            className={`settings-input ${whError ? "is-invalid" : ""}`}
                            placeholder="New warehouse name…"
                            value={newWh}
                            onChange={e => { setNewWh(e.target.value); setWhError(""); }}
                            onKeyDown={e => handleKeyDown(e, addWarehouse)}
                        />
                        <button className="settings-add-btn" onClick={addWarehouse}>
                            <i className="bi bi-plus-lg"></i> Add
                        </button>
                    </div>
                    {whError && <span className="settings-error">{whError}</span>}

                    <div className="settings-list">
                        {warehouses.length === 0 ? (
                            <div className="settings-empty">No warehouses yet.</div>
                        ) : (
                            warehouses.map(wh => (
                                <div key={wh} className="settings-list-item">
                                    <i className="bi bi-building text-primary me-2"></i>
                                    <span>{wh}</span>
                                    <button
                                        className="settings-delete-btn"
                                        onClick={() => deleteWarehouse(wh)}
                                        title="Remove warehouse"
                                    >
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Settings;
