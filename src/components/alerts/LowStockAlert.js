import React from "react";
import "./LowStockAlert.css";

const LowStockAlert = ({ items, onView, onEdit }) => {
    const lowStockItems = items.filter(
        item => Number(item.quantity) <= (Number(item.minThreshold) || 5)
    );

    const criticalItems  = lowStockItems.filter(i => Number(i.quantity) === 0);
    const warningItems   = lowStockItems.filter(i => Number(i.quantity) > 0 && Number(i.quantity) <= 2);
    const cautionItems   = lowStockItems.filter(i => Number(i.quantity) > 2);

    const getStockLevel = (item) => {
        const qty = Number(item.quantity);
        if (qty === 0) return { label: "Out of Stock", cls: "level-critical" };
        if (qty <= 2)  return { label: "Critical",     cls: "level-warning" };
        return             { label: "Low",            cls: "level-caution" };
    };

    const StockCard = ({ item }) => {
        const level = getStockLevel(item);
        const pct = Math.min(100, Math.round(
            (Number(item.quantity) / ((Number(item.minThreshold) || 5) * 2)) * 100
        ));

        return (
            <div className={`stock-card ${level.cls}`}>
                <div className="stock-card-top">
                    <div className="stock-item-info">
                        <span className="stock-item-name">{item.name}</span>
                        <span className="stock-item-meta">
                            {item.category} · {item.warehouse || "N/A"}
                        </span>
                    </div>
                    <span className={`stock-badge ${level.cls}`}>{level.label}</span>
                </div>

                <div className="stock-qty-row">
                    <span className="stock-qty-label">Qty:</span>
                    <span className="stock-qty-val">{item.quantity} {item.uom || "units"}</span>
                    <span className="stock-threshold">/ Limit: {item.minThreshold || 5} {item.uom || "units"}</span>
                </div>

                {/* Progress bar */}
                <div className="stock-bar-track">
                    <div
                        className={`stock-bar-fill ${level.cls}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>

                <div className="stock-card-actions">
                    <button className="stock-view-btn" onClick={() => onView && onView(item)}>
                        <i className="bi bi-eye me-1"></i> View
                    </button>
                    <button className="stock-edit-btn" onClick={() => onEdit && onEdit(item)}>
                        <i className="bi bi-pencil me-1"></i> Restock
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="low-stock-page mt-5">
            <div className="low-stock-header">
                <h2 className="low-stock-title">
                    <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
                    Low Stock Alerts
                </h2>
                <p className="low-stock-subtitle">
                    Items that need restocking. Total: <strong>{lowStockItems.length}</strong> item{lowStockItems.length !== 1 ? "s" : ""}
                </p>
            </div>

            {/* Summary badges */}
            <div className="stock-summary-row">
                <div className="summary-pill critical">
                    <i className="bi bi-x-circle-fill me-1"></i>
                    {criticalItems.length} Out of Stock
                </div>
                <div className="summary-pill warning">
                    <i className="bi bi-exclamation-circle-fill me-1"></i>
                    {warningItems.length} Critical (≤2)
                </div>
                <div className="summary-pill caution">
                    <i className="bi bi-info-circle-fill me-1"></i>
                    {cautionItems.length} Low
                </div>
            </div>

            {lowStockItems.length === 0 ? (
                <div className="no-low-stock">
                    <i className="bi bi-check-circle-fill text-success"></i>
                    <h4>All good! No low stock items.</h4>
                    <p>All items are above their minimum threshold.</p>
                </div>
            ) : (
                <>
                    {criticalItems.length > 0 && (
                        <section className="stock-section">
                            <h5 className="stock-section-title level-critical">
                                <i className="bi bi-x-circle-fill me-2"></i> Out of Stock
                            </h5>
                            <div className="stock-cards-grid">
                                {criticalItems.map(item => <StockCard key={item.id} item={item} />)}
                            </div>
                        </section>
                    )}

                    {warningItems.length > 0 && (
                        <section className="stock-section">
                            <h5 className="stock-section-title level-warning">
                                <i className="bi bi-exclamation-circle-fill me-2"></i> Critical (1–2 units)
                            </h5>
                            <div className="stock-cards-grid">
                                {warningItems.map(item => <StockCard key={item.id} item={item} />)}
                            </div>
                        </section>
                    )}

                    {cautionItems.length > 0 && (
                        <section className="stock-section">
                            <h5 className="stock-section-title level-caution">
                                <i className="bi bi-info-circle-fill me-2"></i> Low Stock
                            </h5>
                            <div className="stock-cards-grid">
                                {cautionItems.map(item => <StockCard key={item.id} item={item} />)}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
};

export default LowStockAlert;
