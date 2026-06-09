import React, { useState, useEffect } from "react";
import { stockLogService } from "../../services/stockLogService";
import "./StockLogModal.css";

/**
 * StockLogModal — shows history of stock in/out for a single item,
 * and lets the user add a new stock movement.
 *
 * Props:
 *   item         — the item object
 *   onClose      — fn to close modal
 *   onUpdateQty  — fn(itemId, delta) to update item quantity in parent
 */
const StockLogModal = ({ item, onClose, onUpdateQty }) => {
    const [logs, setLogs] = useState([]);
    const [type, setType] = useState("in");
    const [qty, setQty] = useState("");
    const [note, setNote] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (item) setLogs(stockLogService.getLogsForItem(item.id));
    }, [item]);

    if (!item) return null;

    const handleAdd = () => {
        const n = Number(qty);
        if (!qty || isNaN(n) || n <= 0) { setError("Enter a valid positive quantity."); return; }
        if (type === "out" && n > Number(item.quantity)) {
            setError(`Cannot remove more than available stock (${item.quantity}).`); return;
        }
        const delta = type === "in" ? n : -n;
        stockLogService.addLog(item.id, item.name, type, n, note.trim());
        onUpdateQty && onUpdateQty(item.id, delta);
        setLogs(stockLogService.getLogsForItem(item.id));
        setQty("");
        setNote("");
        setError("");
    };

    const fmt = (ts) => new Date(ts).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true
    });

    return (
        <div className="slm-overlay" onClick={onClose}>
            <div className="slm-modal" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="slm-header">
                    <div>
                        <h5 className="slm-title">
                            <i className="bi bi-arrow-left-right text-primary me-2"></i>
                            Stock Movement
                        </h5>
                        <p className="slm-subtitle">{item.name}</p>
                    </div>
                    <button className="slm-close" onClick={onClose}>
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                {/* Current Stock */}
                <div className="slm-current-stock">
                    <span className="slm-cs-label">Current Stock</span>
                    <span className="slm-cs-val">{item.quantity}</span>
                    <span className="slm-cs-unit">{item.uom || "units"}</span>
                </div>

                {/* Add movement form */}
                <div className="slm-form">
                    <div className="slm-type-toggle">
                        <button
                            className={`slm-type-btn in ${type === "in" ? "active" : ""}`}
                            onClick={() => { setType("in"); setError(""); }}
                        >
                            <i className="bi bi-arrow-down-circle-fill me-1"></i> Stock In
                        </button>
                        <button
                            className={`slm-type-btn out ${type === "out" ? "active" : ""}`}
                            onClick={() => { setType("out"); setError(""); }}
                        >
                            <i className="bi bi-arrow-up-circle-fill me-1"></i> Stock Out
                        </button>
                    </div>

                    <div className="slm-inputs">
                        <input
                            type="number"
                            className={`slm-input ${error ? "is-invalid" : ""}`}
                            placeholder="Quantity"
                            min="1"
                            value={qty}
                            onChange={e => { setQty(e.target.value); setError(""); }}
                            onKeyDown={e => e.key === "Enter" && handleAdd()}
                        />
                        <input
                            type="text"
                            className="slm-input"
                            placeholder="Note (optional)"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleAdd()}
                        />
                        <button className={`slm-add-btn ${type}`} onClick={handleAdd}>
                            <i className={`bi ${type === "in" ? "bi-plus-lg" : "bi-dash-lg"} me-1`}></i>
                            {type === "in" ? "Add" : "Remove"}
                        </button>
                    </div>
                    {error && <span className="slm-error">{error}</span>}
                </div>

                {/* Log list */}
                <div className="slm-log-list">
                    <div className="slm-log-header">
                        <span>Movement History</span>
                        <span className="slm-log-count">{logs.length} entries</span>
                    </div>

                    {logs.length === 0 ? (
                        <div className="slm-empty">No movements recorded yet.</div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className={`slm-log-item ${log.type}`}>
                                <div className={`slm-log-icon ${log.type}`}>
                                    <i className={`bi ${log.type === "in" ? "bi-arrow-down-circle-fill" : "bi-arrow-up-circle-fill"}`}></i>
                                </div>
                                <div className="slm-log-info">
                                    <span className="slm-log-qty">
                                        {log.type === "in" ? "+" : "-"}{log.qty} {item.uom || "units"}
                                    </span>
                                    {log.note && <span className="slm-log-note">{log.note}</span>}
                                </div>
                                <div className="slm-log-meta">
                                    <span className="slm-log-time">{fmt(log.timestamp)}</span>
                                    {log.userName && <span className="slm-log-user">{log.userName}</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
};

export default StockLogModal;
