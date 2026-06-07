import React, { useState, useEffect, useMemo } from "react";
import "./StockAudit.css";

const StockAudit = ({ items = [], onCompleteAudit }) => {
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [isAuditActive, setIsAuditActive] = useState(false);
  const [auditItems, setAuditItems] = useState([]);
  const [toastMessage, setToastMessage] = useState("");

  // Extract unique warehouses from all active items
  const warehouses = useMemo(() => {
    const unique = new Set();
    items.forEach((item) => {
      if (item.warehouse) {
        const w = item.warehouse.trim();
        if (w) unique.add(w);
      }
    });
    return [...unique].sort();
  }, [items]);

  // Load audit draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("audit_draft");
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && parsed.items && parsed.items.length > 0) {
          setSelectedWarehouse(parsed.warehouse || "all");
          setAuditItems(parsed.items);
          setIsAuditActive(true);
        }
      }
    } catch (e) {
      console.error("Failed to load audit draft", e);
    }
  }, []);

  // Show inline feedback toast
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 4000);
  };

  // Start new audit session
  const handleStartAudit = () => {
    const targetItems = items.filter((item) => {
      if (item.status !== "1") return false; // active items only
      if (selectedWarehouse === "all") return true;
      return (item.warehouse || "").trim() === selectedWarehouse.trim();
    });

    if (targetItems.length === 0) {
      triggerToast("No active items found in the selected warehouse.");
      return;
    }

    const initialAuditItems = targetItems.map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      category: item.category,
      warehouse: item.warehouse,
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 0,
      countedQty: "", // empty means not audited yet
    }));

    setAuditItems(initialAuditItems);
    setIsAuditActive(true);
    saveDraftToStorage(selectedWarehouse, initialAuditItems);
    triggerToast("Audit session started successfully.");
  };

  // Save current audit counts to LocalStorage as draft
  const saveDraftToStorage = (warehouse, itemsList) => {
    localStorage.setItem(
      "audit_draft",
      JSON.stringify({ warehouse, items: itemsList })
    );
  };

  const handleSaveDraft = () => {
    saveDraftToStorage(selectedWarehouse, auditItems);
    triggerToast("Audit draft saved successfully.");
  };

  const handleCancelAudit = () => {
    if (window.confirm("Are you sure you want to cancel the current audit? All counted values will be lost.")) {
      localStorage.removeItem("audit_draft");
      setIsAuditActive(false);
      setAuditItems([]);
      setSelectedWarehouse("all");
      triggerToast("Audit session canceled.");
    }
  };

  // Handle count input change
  const handleCountChange = (id, val) => {
    const cleanedVal = val.replace(/[^0-9]/g, ""); // positive integers only
    const updated = auditItems.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          countedQty: cleanedVal === "" ? "" : Number(cleanedVal),
        };
      }
      return item;
    });

    setAuditItems(updated);
    saveDraftToStorage(selectedWarehouse, updated);
  };

  // Real-time calculations
  const stats = useMemo(() => {
    let totalItems = auditItems.length;
    let auditedCount = 0;
    let discrepancyCount = 0;
    let totalAdjustmentValue = 0;

    auditItems.forEach((item) => {
      if (item.countedQty !== "") {
        auditedCount++;
        const variance = item.countedQty - item.quantity;
        if (variance !== 0) {
          discrepancyCount++;
          totalAdjustmentValue += variance * item.price;
        }
      }
    });

    return {
      totalItems,
      auditedCount,
      discrepancyCount,
      totalAdjustmentValue,
    };
  }, [auditItems]);

  // Submit and Complete Audit
  const handleComplete = () => {
    if (stats.auditedCount === 0) {
      alert("Please enter physical counts for at least one item before completing the audit.");
      return;
    }

    const confirmMsg = `Are you sure you want to complete this audit?
- Audited: ${stats.auditedCount} / ${stats.totalItems} items.
- Discrepancies detected: ${stats.discrepancyCount} items.
- Total Value Shift: ₹ ${stats.totalAdjustmentValue.toLocaleString()}

Stock values will be updated and ledger transaction logs created.`;

    if (window.confirm(confirmMsg)) {
      localStorage.removeItem("audit_draft");
      // Filter out items that were actually counted
      const adjustments = auditItems.filter((i) => i.countedQty !== "");
      onCompleteAudit(adjustments, selectedWarehouse === "all" ? "All Warehouses" : selectedWarehouse);
    }
  };

  return (
    <div className="stock-audit-page animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && <div className="audit-toast-box">{toastMessage}</div>}

      {/* 🔹 SETUP STAGE (If audit is NOT active) */}
      {!isAuditActive ? (
        <div className="audit-setup-card card-box">
          <div className="setup-header">
            <div className="setup-icon-box">
              <i className="bi bi-clipboard-check"></i>
            </div>
            <div>
              <h3>Start Physical Inventory Audit</h3>
              <p className="text-muted">
                Run physical stock counts to verify matching levels, calculate valuation shifts, and reconcile items back into stock ledgers.
              </p>
            </div>
          </div>

          <div className="setup-form">
            <div className="setup-field">
              <label>Select Warehouse Scope</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="tform-input"
              >
                <option value="all">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn-audit-primary"
              onClick={handleStartAudit}
            >
              <i className="bi bi-play-fill me-1"></i> Start Audit Session
            </button>
          </div>
        </div>
      ) : (
        /* 🔹 ACTIVE AUDIT STAGE */
        <div className="audit-active-container">
          
          {/* Active Header & Top Controls */}
          <div className="audit-active-header card-box">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div>
                <span className="wh-badge">
                  <i className="bi bi-building me-1"></i>
                  {selectedWarehouse === "all" ? "All Warehouses" : selectedWarehouse}
                </span>
                <h3 className="audit-title mt-2">Physical Stocktake in Progress</h3>
                <p className="audit-subtitle text-muted">
                  Type counted physical quantities below. Draft values auto-save in local storage.
                </p>
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn-audit-secondary"
                  onClick={handleSaveDraft}
                  title="Save counts without posting adjustments"
                >
                  <i className="bi bi-save me-1"></i> Save Draft
                </button>
                <button
                  type="button"
                  className="btn-audit-danger"
                  onClick={handleCancelAudit}
                >
                  <i className="bi bi-trash me-1"></i> Cancel
                </button>
                <button
                  type="button"
                  className="btn-audit-success"
                  onClick={handleComplete}
                >
                  <i className="bi bi-check-circle me-1"></i> Reconcile & Complete
                </button>
              </div>
            </div>
          </div>

          {/* Stats KPI Widgets */}
          <div className="audit-kpi-grid mt-4">
            <div className="audit-kpi-card">
              <div className="kpi-icon-wrapper blue">
                <i className="bi bi-boxes"></i>
              </div>
              <div className="kpi-data">
                <span>Total Items</span>
                <h4>{stats.totalItems}</h4>
              </div>
            </div>

            <div className="audit-kpi-card">
              <div className="kpi-icon-wrapper purple">
                <i className="bi bi-clipboard-check"></i>
              </div>
              <div className="kpi-data">
                <span>Audited Count</span>
                <h4>
                  {stats.auditedCount} <small>({Math.round((stats.auditedCount / stats.totalItems) * 100) || 0}%)</small>
                </h4>
              </div>
            </div>

            <div className="audit-kpi-card">
              <div className="kpi-icon-wrapper orange">
                <i className="bi bi-exclamation-triangle"></i>
              </div>
              <div className="kpi-data">
                <span>Discrepancies</span>
                <h4 className={stats.discrepancyCount > 0 ? "text-warning-glow" : ""}>
                  {stats.discrepancyCount}
                </h4>
              </div>
            </div>

            <div className="audit-kpi-card">
              <div className="kpi-icon-wrapper green">
                <i className="bi bi-currency-rupee"></i>
              </div>
              <div className="kpi-data">
                <span>Value Adjustment</span>
                <h4 style={{ color: stats.totalAdjustmentValue >= 0 ? "#22c55e" : "#ef4444" }}>
                  {stats.totalAdjustmentValue >= 0 ? "+" : ""}
                  ₹ {stats.totalAdjustmentValue.toLocaleString()}
                </h4>
              </div>
            </div>
          </div>

          {/* Items Audit Table Card */}
          <div className="audit-table-card card-box mt-4">
            <div className="table-responsive">
              <table className="audit-table-element">
                <thead>
                  <tr>
                    <th>Item Details</th>
                    <th>Warehouse</th>
                    <th>Recorded Qty</th>
                    <th>Physical Counted Qty</th>
                    <th>Variance</th>
                    <th>Valuation Adjustment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {auditItems.map((item) => {
                    const isAudited = item.countedQty !== "";
                    const variance = isAudited ? item.countedQty - item.quantity : 0;
                    const valChange = variance * item.price;

                    let statusBadge = { label: "Pending", class: "badge-system" };
                    if (isAudited) {
                      if (variance === 0) {
                        statusBadge = { label: "Matched", class: "badge-add" };
                      } else {
                        statusBadge = { label: "Variance", class: "badge-update" };
                      }
                    }

                    return (
                      <tr key={item.id} className={isAudited ? "row-audited" : ""}>
                        <td>
                          <div className="d-flex flex-column">
                            <span className="item-title-text">{item.name}</span>
                            <span className="text-muted" style={{ fontSize: "11px" }}>
                              {item.code} | {item.category}
                            </span>
                          </div>
                        </td>
                        <td>{item.warehouse || "Unassigned"}</td>
                        <td>
                          <span className="recorded-qty-val">{item.quantity} units</span>
                        </td>
                        <td>
                          <div className="input-counted-wrapper">
                            <input
                              type="text"
                              value={item.countedQty}
                              onChange={(e) => handleCountChange(item.id, e.target.value)}
                              placeholder="Enter count"
                              className="input-counted-field"
                            />
                            <button
                              type="button"
                              className="btn-input-sync"
                              title="Sync Counted with Recorded"
                              onClick={() => handleCountChange(item.id, String(item.quantity))}
                            >
                              <i className="bi bi-arrow-repeat"></i>
                            </button>
                          </div>
                        </td>
                        <td>
                          {isAudited ? (
                            <span
                              className={`variance-val ${
                                variance > 0 ? "positive" : variance < 0 ? "negative" : "zero"
                              }`}
                            >
                              {variance > 0 ? `+${variance}` : variance}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {isAudited ? (
                            <span
                              className={`val-change-val ${
                                valChange > 0 ? "positive" : valChange < 0 ? "negative" : "zero"
                              }`}
                            >
                              {valChange > 0 ? `+₹${valChange.toLocaleString()}` : valChange < 0 ? `-₹${Math.abs(valChange).toLocaleString()}` : "₹ 0"}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`action-tag ${statusBadge.class}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default StockAudit;
