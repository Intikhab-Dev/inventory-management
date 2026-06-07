import React, { useState, useEffect } from "react";
import "./StockOut.css";

const StockOut = ({ items = [], onStockOut }) => {
    const [selectedItemId, setSelectedItemId] = useState("");
    const [qty, setQty] = useState("");
    const [reason, setReason] = useState("");
    const [dispatchedTo, setDispatchedTo] = useState("");
    const [notes, setNotes] = useState("");
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState("");

    // Filter items that have stock and are active
    const activeStockItems = React.useMemo(() => {
        return items.filter(item => Number(item.quantity || 0) > 0 && item.status === "1");
    }, [items]);

    const selectedItem = React.useMemo(() => {
        return items.find(item => String(item.id) === String(selectedItemId));
    }, [selectedItemId, items]);

    // Clear success message after 5 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(""), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Reset fields on successful stock out
    const resetForm = () => {
        setSelectedItemId("");
        setQty("");
        setReason("");
        setDispatchedTo("");
        setNotes("");
        setErrors({});
    };

    const validate = () => {
        const tempErrors = {};
        if (!selectedItemId) {
            tempErrors.item = "Please select an item.";
        } else if (selectedItem) {
            const numQty = Number(qty);
            if (!qty || isNaN(numQty) || numQty <= 0) {
                tempErrors.qty = "Quantity must be a positive number.";
            } else if (numQty > Number(selectedItem.quantity || 0)) {
                tempErrors.qty = `Quantity cannot exceed available stock (${selectedItem.quantity}).`;
            }
        }

        if (!reason) {
            tempErrors.reason = "Please select a reason for stock out.";
        }

        if (!dispatchedTo.trim()) {
            tempErrors.dispatchedTo = "Please specify who/where the stock is dispatched to.";
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;

        // Perform stock out dispatch
        if (onStockOut && selectedItem) {
            onStockOut(
                selectedItem.id,
                Number(qty),
                reason,
                dispatchedTo.trim(),
                notes.trim()
            );
            
            setSuccessMessage(`Successfully dispatched ${qty} units of "${selectedItem.name}"!`);
            resetForm();
        }
    };

    return (
        <div className="stockout-page mt-5">
            {/* ── Page Header ── */}
            <div className="stockout-header">
                <div>
                    <h2 className="stockout-title">
                        <i className="bi bi-arrow-up-right-circle text-danger me-2"></i>
                        Stock Dispatch (Stock OUT)
                    </h2>
                    <p className="stockout-subtitle">Record stock dispatch, sales, internal consumption, or damage disposal.</p>
                </div>
            </div>

            <div className="stockout-layout">
                {/* ── Dispatch Form Card ── */}
                <div className="stockout-form-card">
                    <div className="sform-header dispatch-theme">
                        <h5>📤 Record Dispatch Transaction</h5>
                    </div>

                    <form onSubmit={handleSubmit} className="stockout-form-grid" noValidate>
                        {/* Item Selection */}
                        <div className="sform-group sfull">
                            <label>Select Item to Dispatch <span className="req">*</span></label>
                            <select
                                value={selectedItemId}
                                onChange={e => {
                                    setSelectedItemId(e.target.value);
                                    setQty("");
                                    if (errors.item) setErrors(prev => { const n = { ...prev }; delete n.item; return n; });
                                }}
                                className={`sform-input ${errors.item ? "sinvalid" : ""}`}
                            >
                                <option value="">-- Select Stock Item --</option>
                                {activeStockItems.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} [{item.code || "No Code"}] — {item.quantity} available ({item.warehouse || "No Warehouse"})
                                    </option>
                                ))}
                            </select>
                            {errors.item && <span className="serror">{errors.item}</span>}
                        </div>

                        {/* Selected Item Info Pane */}
                        {selectedItem && (
                            <div className="item-info-pane sfull animate-fade-in">
                                <div className="info-cell">
                                    <span className="info-label">Category</span>
                                    <span className="info-val">{selectedItem.category}</span>
                                </div>
                                <div className="info-cell">
                                    <span className="info-label">Warehouse</span>
                                    <span className="info-val">{selectedItem.warehouse || "—"}</span>
                                </div>
                                <div className="info-cell">
                                    <span className="info-label">Current Stock</span>
                                    <span className="info-val highlight-qty">{selectedItem.quantity} units</span>
                                </div>
                                <div className="info-cell">
                                    <span className="info-label">Unit Price</span>
                                    <span className="info-val">₹{Number(selectedItem.price).toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        {/* Quantity */}
                        <div className="sform-group">
                            <label>Quantity to Dispatch <span className="req">*</span></label>
                            <input
                                type="number"
                                min="1"
                                placeholder="e.g. 5"
                                value={qty}
                                onChange={e => {
                                    setQty(e.target.value);
                                    if (errors.qty) setErrors(prev => { const n = { ...prev }; delete n.qty; return n; });
                                }}
                                className={`sform-input ${errors.qty ? "sinvalid" : ""}`}
                            />
                            {errors.qty && <span className="serror">{errors.qty}</span>}
                        </div>

                        {/* Reason */}
                        <div className="sform-group">
                            <label>Dispatch Reason <span className="req">*</span></label>
                            <select
                                value={reason}
                                onChange={e => {
                                    setReason(e.target.value);
                                    if (errors.reason) setErrors(prev => { const n = { ...prev }; delete n.reason; return n; });
                                }}
                                className={`sform-input ${errors.reason ? "sinvalid" : ""}`}
                            >
                                <option value="">-- Select Reason --</option>
                                <option value="Sales / Invoice">Sales / Invoice</option>
                                <option value="Internal Department Consumption">Internal Department Consumption</option>
                                <option value="Damaged / Broken Disposal">Damaged / Broken Disposal</option>
                                <option value="Lost / Stolen">Lost / Stolen</option>
                                <option value="Expired Stock Removal">Expired Stock Removal</option>
                                <option value="Marketing / Gift / Promo">Marketing / Gift / Promo</option>
                                <option value="Inter-Warehouse Transfer">Inter-Warehouse Transfer</option>
                                <option value="Inventory Correction">Inventory Correction</option>
                            </select>
                            {errors.reason && <span className="serror">{errors.reason}</span>}
                        </div>

                        {/* Dispatched To */}
                        <div className="sform-group sfull">
                            <label>Dispatched To / Destination <span className="req">*</span></label>
                            <input
                                type="text"
                                placeholder="e.g. IT Department, Sales Team, Client Name, Waste Bin"
                                value={dispatchedTo}
                                onChange={e => {
                                    setDispatchedTo(e.target.value);
                                    if (errors.dispatchedTo) setErrors(prev => { const n = { ...prev }; delete n.dispatchedTo; return n; });
                                }}
                                className={`sform-input ${errors.dispatchedTo ? "sinvalid" : ""}`}
                            />
                            {errors.dispatchedTo && <span className="serror">{errors.dispatchedTo}</span>}
                        </div>

                        {/* Notes */}
                        <div className="sform-group sfull">
                            <label>Reference Notes (Optional)</label>
                            <textarea
                                placeholder="Enter invoice details, requisition codes, or specific descriptions..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="sform-input sform-textarea"
                            />
                        </div>

                        {/* Submit Actions */}
                        <div className="sform-actions sfull">
                            <button type="button" className="sform-cancel" onClick={resetForm}>Clear Form</button>
                            <button type="submit" className="sform-submit btn-dispatch">
                                <i className="bi bi-arrow-up-right-circle me-1"></i> Dispatch Stock
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── Status Info Side Panel ── */}
                <div className="stockout-side-panel">
                    {successMessage && (
                        <div className="stockout-success-card animate-fade-in">
                            <div className="scard-icon"><i className="bi bi-check-circle-fill"></i></div>
                            <div className="scard-text">
                                <h6>Dispatch Recorded!</h6>
                                <p>{successMessage}</p>
                            </div>
                        </div>
                    )}

                    <div className="dispatch-info-card">
                        <h5>📋 Dispatch Guidelines</h5>
                        <ul>
                            <li>Make sure to verify physical stocks before dispatching items.</li>
                            <li>Dispatching reduces item quantity in real-time.</li>
                            <li>All stock out events are logged in the **Stock Transactions Ledger** for audit reports.</li>
                            <li>Check stock thresholds as some items might trigger **Low Stock Alert** warnings after dispatch.</li>
                        </ul>
                        <div className="guideline-kpi">
                            <span className="gkpi-num">{activeStockItems.length}</span>
                            <span className="gkpi-label">Items Available for Dispatch</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockOut;
