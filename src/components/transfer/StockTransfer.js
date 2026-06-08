import React, { useState, useEffect, useMemo } from "react";
import "./StockTransfer.css";

const StockTransfer = ({ items = [], onTransfer }) => {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [targetWarehouse, setTargetWarehouse] = useState("");
  const [newWarehouseName, setNewWarehouseName] = useState("");
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  // Filter items that have stock and are active
  const activeStockItems = useMemo(() => {
    return items.filter(
      (item) => Number(item.quantity || 0) > 0 && item.status === "1"
    );
  }, [items]);

  const selectedItem = useMemo(() => {
    return items.find((item) => String(item.id) === String(selectedItemId));
  }, [selectedItemId, items]);

  useEffect(() => {
    if (selectedItem) {
      setBillNumber(selectedItem.billNumber || "");
      setBillDate(selectedItem.billDate || "");
      setPoNumber(selectedItem.poNumber || "");
    } else {
      setBillNumber("");
      setBillDate("");
      setPoNumber("");
    }
  }, [selectedItem]);

  // Extract unique warehouses from all items in system
  const warehouses = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      if (item.warehouse) {
        const w = item.warehouse.trim();
        if (w) set.add(w);
      }
    });
    return [...set].sort();
  }, [items]);

  // Clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const resetForm = () => {
    setSelectedItemId("");
    setTargetWarehouse("");
    setNewWarehouseName("");
    setQty("");
    setNotes("");
    setBillNumber("");
    setBillDate("");
    setPoNumber("");
    setErrors({});
  };

  const validate = () => {
    const tempErrors = {};
    if (!selectedItemId) {
      tempErrors.item = "Please select an item to transfer.";
    } else if (selectedItem) {
      const numQty = Number(qty);
      if (!qty || isNaN(numQty) || numQty <= 0) {
        tempErrors.qty = "Quantity must be a positive number.";
      } else if (numQty > Number(selectedItem.quantity || 0)) {
        tempErrors.qty = `Quantity cannot exceed available stock (${selectedItem.quantity}).`;
      }
    }

    if (!targetWarehouse) {
      tempErrors.targetWh = "Please select a target warehouse.";
    } else if (targetWarehouse === "__new__" && !newWarehouseName.trim()) {
      tempErrors.newWh = "Please specify the name of the new warehouse.";
    } else if (selectedItem) {
      const finalTarget =
        targetWarehouse === "__new__"
          ? newWarehouseName.trim().toLowerCase()
          : targetWarehouse.trim().toLowerCase();
      const finalSource = (selectedItem.warehouse || "")
        .trim()
        .toLowerCase();
      if (finalTarget === finalSource) {
        tempErrors.targetWh = "Source and target warehouses cannot be the same.";
      }
    }

    if (!billNumber || !billNumber.trim()) {
      tempErrors.billNumber = "Bill Number is required.";
    }
    if (!billDate) {
      tempErrors.billDate = "Bill Date is required.";
    }
    if (!poNumber || !poNumber.trim()) {
      tempErrors.poNumber = "PO Number is required.";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (onTransfer && selectedItem) {
      const finalTargetWh =
        targetWarehouse === "__new__" ? newWarehouseName.trim() : targetWarehouse;
      
      onTransfer(
        selectedItem.id,
        selectedItem.warehouse,
        finalTargetWh,
        Number(qty),
        notes.trim(),
        billNumber.trim(),
        billDate,
        poNumber.trim()
      );

      setSuccessMessage(
        `Successfully transferred ${qty} units of "${selectedItem.name}" to "${finalTargetWh}"!`
      );
      resetForm();
    }
  };

  return (
    <div className="transfer-page mt-5 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="transfer-header">
        <div>
          <h2 className="transfer-title">
            <i className="bi bi-arrow-left-right text-primary me-2"></i>
            Stock Transfer (Warehouse Move)
          </h2>
          <p className="transfer-subtitle">
            Transfer quantities of items between storage facilities.
          </p>
        </div>
      </div>

      <div className="transfer-layout">
        {/* ── Form Card ── */}
        <div className="transfer-form-card card-box">
          <div className="tform-header transfer-theme">
            <h5>🔄 Record Inter-Warehouse Stock Transfer</h5>
          </div>

          <form onSubmit={handleSubmit} className="transfer-form-grid" noValidate>
            {/* Item Selection */}
            <div className="tform-group tfull">
              <label>Select Item to Transfer <span className="req">*</span></label>
              <select
                value={selectedItemId}
                onChange={(e) => {
                  setSelectedItemId(e.target.value);
                  setQty("");
                  if (errors.item) {
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.item;
                      return n;
                    });
                  }
                }}
                className={`tform-input ${errors.item ? "tinvalid" : ""}`}
              >
                <option value="">-- Select Stock Item --</option>
                {activeStockItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} [{item.code || "No Code"}] — {item.quantity} available ({item.warehouse || "No Warehouse"})
                  </option>
                ))}
              </select>
              {errors.item && <span className="terror">{errors.item}</span>}
            </div>

            {/* Selected Item Info Pane */}
            {selectedItem && (
              <div className="item-info-pane tfull animate-fade-in">
                <div className="info-cell">
                  <span className="info-label">Category</span>
                  <span className="info-val">{selectedItem.category}</span>
                </div>
                <div className="info-cell">
                  <span className="info-label">Source Warehouse</span>
                  <span className="info-val highlight-wh">{selectedItem.warehouse || "—"}</span>
                </div>
                <div className="info-cell">
                  <span className="info-label">Available Stock</span>
                  <span className="info-val highlight-qty">{selectedItem.quantity} units</span>
                </div>
                <div className="info-cell">
                  <span className="info-label">Unit Price</span>
                  <span className="info-val">₹{Number(selectedItem.price).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="tform-group">
              <label>Quantity to Transfer <span className="req">*</span></label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 10"
                value={qty}
                onChange={(e) => {
                  setQty(e.target.value);
                  if (errors.qty) {
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.qty;
                      return n;
                    });
                  }
                }}
                className={`tform-input ${errors.qty ? "tinvalid" : ""}`}
              />
              {errors.qty && <span className="terror">{errors.qty}</span>}
            </div>

            {/* Target Warehouse */}
            <div className="tform-group">
              <label>Target Warehouse <span className="req">*</span></label>
              <select
                value={targetWarehouse}
                onChange={(e) => {
                  setTargetWarehouse(e.target.value);
                  if (errors.targetWh) {
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.targetWh;
                      return n;
                    });
                  }
                }}
                className={`tform-input ${errors.targetWh ? "tinvalid" : ""}`}
              >
                <option value="">-- Select Target Warehouse --</option>
                {warehouses.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
                <option value="__new__">+ Add New Warehouse</option>
              </select>
              {errors.targetWh && <span className="terror">{errors.targetWh}</span>}
            </div>

            {/* Custom New Warehouse Name */}
            {targetWarehouse === "__new__" && (
              <div className="tform-group tfull animate-slide-up">
                <label>New Warehouse Name <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. West Coast Facility"
                  value={newWarehouseName}
                  onChange={(e) => {
                    setNewWarehouseName(e.target.value);
                    if (errors.newWh) {
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.newWh;
                        return n;
                      });
                    }
                  }}
                  className={`tform-input ${errors.newWh ? "tinvalid" : ""}`}
                />
                {errors.newWh && <span className="terror">{errors.newWh}</span>}
              </div>
            )}

            {/* Bill Number */}
            <div className="tform-group">
              <label>Bill Number <span className="req">*</span></label>
              <input
                type="text"
                placeholder="e.g. BILL-12345"
                value={billNumber}
                onChange={(e) => {
                  setBillNumber(e.target.value);
                  if (errors.billNumber) {
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.billNumber;
                      return n;
                    });
                  }
                }}
                className={`tform-input ${errors.billNumber ? "tinvalid" : ""}`}
              />
              {errors.billNumber && <span className="terror">{errors.billNumber}</span>}
            </div>

            {/* Bill Date */}
            <div className="tform-group">
              <label>Bill Date <span className="req">*</span></label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => {
                  setBillDate(e.target.value);
                  if (errors.billDate) {
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.billDate;
                      return n;
                    });
                  }
                }}
                onClick={(e) => {
                  if (typeof e.target.showPicker === "function") {
                    try { e.target.showPicker(); } catch (err) {}
                  }
                }}
                className={`tform-input ${errors.billDate ? "tinvalid" : ""}`}
              />
              {errors.billDate && <span className="terror">{errors.billDate}</span>}
            </div>

            {/* PO Number */}
            <div className="tform-group tfull">
              <label>PO Number <span className="req">*</span></label>
              <input
                type="text"
                placeholder="e.g. PO-98765"
                value={poNumber}
                onChange={(e) => {
                  setPoNumber(e.target.value);
                  if (errors.poNumber) {
                    setErrors((prev) => {
                      const n = { ...prev };
                      delete n.poNumber;
                      return n;
                    });
                  }
                }}
                className={`tform-input ${errors.poNumber ? "tinvalid" : ""}`}
              />
              {errors.poNumber && <span className="terror">{errors.poNumber}</span>}
            </div>

            {/* Notes */}
            <div className="tform-group tfull">
              <label>Reference Notes (Optional)</label>
              <textarea
                placeholder="Enter details about the transfer, delivery agent, vehicle numbers, etc..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="tform-input tform-textarea"
              />
            </div>

            {/* Submit Actions */}
            <div className="tform-actions tfull">
              <button type="button" className="tform-cancel" onClick={resetForm}>
                Clear Form
              </button>
              <button type="submit" className="tform-submit btn-transfer">
                <i className="bi bi-arrow-left-right me-1"></i> Transfer Stock
              </button>
            </div>
          </form>
        </div>

        {/* ── Guidance Side Panel ── */}
        <div className="transfer-side-panel">
          {successMessage && (
            <div className="transfer-success-card animate-fade-in">
              <div className="tcard-icon">
                <i className="bi bi-check-circle-fill"></i>
              </div>
              <div className="tcard-text">
                <h6>Transfer Recorded!</h6>
                <p>{successMessage}</p>
              </div>
            </div>
          )}

          <div className="transfer-info-card">
            <h5>📋 Transfer Regulations</h5>
            <ul>
              <li>Stock transfers decrease items in the source warehouse and increase/create them in the target warehouse.</li>
              <li>Dual transaction entries are logged inside the **Stock Transactions Ledger** (OUT for source, IN for target).</li>
              <li>Always ensure the target warehouse is clear to handle incoming quantities.</li>
              <li>If the target warehouse is a newly specified name, it will be automatically added to the system catalog options.</li>
            </ul>
            <div className="guideline-kpi">
              <span className="gkpi-num">{warehouses.length}</span>
              <span className="gkpi-label">Active Storage Warehouses</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTransfer;
