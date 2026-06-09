import React, { useState, useEffect } from "react";
import "./Settings.css";

const STORAGE_KEY_CAT = "customCategories";
const STORAGE_KEY_WH  = "customWarehouses";
const STORAGE_KEY_UOM = "customUoms";
const STORAGE_KEY_TAX = "customTaxSlabs";

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
const DEFAULT_UOMS = ["Pcs", "Kg", "Ltr", "Box", "Pkt", "Mtr", "Set"];
const DEFAULT_TAX_SLABS = ["GST 0%", "GST 5%", "GST 12%", "GST 18%", "GST 28%"];

const Settings = () => {
    const [categories, setCategories] = useState(() => loadList(STORAGE_KEY_CAT, DEFAULT_CATEGORIES));
    const [warehouses, setWarehouses]  = useState(() => loadList(STORAGE_KEY_WH,  DEFAULT_WAREHOUSES));
    const [uoms, setUoms] = useState(() => loadList(STORAGE_KEY_UOM, DEFAULT_UOMS));
    const [taxSlabs, setTaxSlabs] = useState(() => loadList(STORAGE_KEY_TAX, DEFAULT_TAX_SLABS));

    const [newCat, setNewCat] = useState("");
    const [newWh,  setNewWh]  = useState("");
    const [newUom, setNewUom] = useState("");
    const [newTax, setNewTax] = useState("");

    const [catError, setCatError] = useState("");
    const [whError,  setWhError]  = useState("");
    const [uomError, setUomError] = useState("");
    const [taxError, setTaxError] = useState("");

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

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_UOM, JSON.stringify(uoms));
    }, [uoms]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_TAX, JSON.stringify(taxSlabs));
    }, [taxSlabs]);

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

    // ── UoM actions ──
    const addUom = () => {
        const val = newUom.trim();
        if (!val) { setUomError("UoM name cannot be empty."); return; }
        if (uoms.map(u => u.toLowerCase()).includes(val.toLowerCase())) {
            setUomError("UoM already exists."); return;
        }
        setUoms(prev => [...prev, val]);
        setNewUom("");
        setUomError("");
        flash("Unit added ✓");
    };

    const deleteUom = (uom) => {
        setUoms(prev => prev.filter(u => u !== uom));
        flash("Unit removed ✓");
    };

    // ── Tax Slab actions ──
    const addTaxSlab = () => {
        let val = newTax.trim();
        if (!val) { setTaxError("Tax slab cannot be empty."); return; }
        
        // If it doesn't contain "%", format and append it
        if (!val.includes("%")) {
            if (/^\d+(?:\.\d+)?$/.test(val)) {
                // If it is just a number (e.g. 18 or 12.5), prefix with GST and suffix with %
                val = `GST ${val}%`;
            } else {
                // Otherwise (e.g. GST 18 or Tax 18), just append %
                val = `${val}%`;
            }
        }
        
        if (taxSlabs.map(t => t.toLowerCase()).includes(val.toLowerCase())) {
            setTaxError("Tax slab already exists."); return;
        }
        setTaxSlabs(prev => [...prev, val]);
        setNewTax("");
        setTaxError("");
        flash("Tax slab added ✓");
    };

    const deleteTaxSlab = (slab) => {
        setTaxSlabs(prev => prev.filter(t => t !== slab));
        flash("Tax slab removed ✓");
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

                {/* ── UOMS (UNITS) ── */}
                <div className="settings-card">
                    <div className="settings-card-header">
                        <i className="bi bi-box-seam-fill text-primary me-2"></i>
                        <h5>Units of Measurement (UoM)</h5>
                        <span className="settings-count">{uoms.length}</span>
                    </div>

                    <div className="settings-add-row">
                        <input
                            type="text"
                            className={`settings-input ${uomError ? "is-invalid" : ""}`}
                            placeholder="New unit (e.g. Kg, Pcs)…"
                            value={newUom}
                            onChange={e => { setNewUom(e.target.value); setUomError(""); }}
                            onKeyDown={e => handleKeyDown(e, addUom)}
                        />
                        <button className="settings-add-btn" onClick={addUom}>
                            <i className="bi bi-plus-lg"></i> Add
                        </button>
                    </div>
                    {uomError && <span className="settings-error">{uomError}</span>}

                    <div className="settings-list">
                        {uoms.length === 0 ? (
                            <div className="settings-empty">No units yet.</div>
                        ) : (
                            uoms.map(uom => (
                                <div key={uom} className="settings-list-item">
                                    <i className="bi bi-rulers text-primary me-2"></i>
                                    <span>{uom}</span>
                                    <button
                                        className="settings-delete-btn"
                                        onClick={() => deleteUom(uom)}
                                        title="Remove unit"
                                    >
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── TAX SLABS ── */}
                <div className="settings-card">
                    <div className="settings-card-header">
                        <i className="bi bi-percent text-primary me-2"></i>
                        <h5>Tax Slabs / GST</h5>
                        <span className="settings-count">{taxSlabs.length}</span>
                    </div>

                    <div className="settings-add-row">
                        <input
                            type="text"
                            className={`settings-input ${taxError ? "is-invalid" : ""}`}
                            placeholder="New slab (e.g. GST 18%)…"
                            value={newTax}
                            onChange={e => { setNewTax(e.target.value); setTaxError(""); }}
                            onKeyDown={e => handleKeyDown(e, addTaxSlab)}
                        />
                        <button className="settings-add-btn" onClick={addTaxSlab}>
                            <i className="bi bi-plus-lg"></i> Add
                        </button>
                    </div>
                    {taxError && <span className="settings-error">{taxError}</span>}

                    <div className="settings-list">
                        {taxSlabs.length === 0 ? (
                            <div className="settings-empty">No tax slabs yet.</div>
                        ) : (
                            taxSlabs.map(slab => (
                                <div key={slab} className="settings-list-item">
                                    <i className="bi bi-cash-coin text-primary me-2"></i>
                                    <span>{slab}</span>
                                    <button
                                        className="settings-delete-btn"
                                        onClick={() => deleteTaxSlab(slab)}
                                        title="Remove slab"
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
