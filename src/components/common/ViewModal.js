import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { getProductImage } from "../../services/imageService";
import "./ViewModal.css";

const ViewModal = ({ show, onClose, item, onAdjustStock }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjType, setAdjType] = useState("IN"); // IN or OUT
  const [adjQty, setAdjQty] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [adjNotes, setAdjNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [qrZoomed, setQrZoomed] = useState(false);

  useEffect(() => {
    setShowAdjust(false);
    setAdjType("IN");
    setAdjQty("");
    setAdjReason("");
    setAdjNotes("");
    setErrors({});
    setQrZoomed(false);
  }, [item]);

  useEffect(() => {
    if (!item) return;

    const qrText = `Item Code: ${item.code || "N/A"}\n` +
                   `Name: ${item.name}\n` +
                   `Warehouse: ${item.warehouse || "Unassigned"}\n` +
                   `Quantity: ${item.quantity} ${item.uom || "units"}\n` +
                   `Price: ₹${Number(item.price).toLocaleString()}\n` +
                   `Total: ₹${Number(item.total).toLocaleString()}\n` +
                   `Supplier: ${item.supplier || "N/A"}\n` +
                   `Bill No: ${item.billNumber || "N/A"}\n` +
                   `Bill Date: ${item.billDate ? new Date(item.billDate).toLocaleDateString("en-GB") : "N/A"}\n` +
                   `PO No: ${item.poNumber || "N/A"}`;

    QRCode.toDataURL(qrText, { margin: 2, width: 200 })
      .then((url) => {
        setQrCodeUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate QR Code", err);
      });
  }, [item]);

  if (!show || !item) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
      alert("Please allow popups to print the receipt");
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Stock Slip - ${item.name}</title>
  <style>
    @media print {
      body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1e293b;
      padding: 40px;
      max-width: 800px;
      margin: auto;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px double #4f46e5;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .company-details h1 {
      margin: 0 0 5px;
      font-size: 28px;
      color: #4f46e5;
      letter-spacing: 0.5px;
    }
    .company-details p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    .slip-details {
      text-align: right;
    }
    .slip-details h2 {
      margin: 0 0 10px;
      font-size: 20px;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .slip-details p {
      margin: 2px 0;
      font-size: 13px;
      color: #64748b;
    }
    .bill-to {
      margin-bottom: 25px;
      background: #f8fafc;
      padding: 15px 20px;
      border-radius: 8px;
      border-left: 4px solid #4f46e5;
    }
    .bill-to h3 {
      margin: 0 0 8px;
      font-size: 14px;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.5px;
    }
    .bill-to p {
      margin: 2px 0;
      font-size: 14px;
      color: #1e293b;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
    }
    .details-table th {
      background: #4f46e5;
      color: #fff;
      padding: 12px 15px;
      font-size: 14px;
      text-transform: uppercase;
      text-align: left;
    }
    .details-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    .details-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .totals-box {
      width: 300px;
      margin-left: auto;
      margin-bottom: 40px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    .total-row.grand-total {
      font-size: 18px;
      font-weight: bold;
      color: #4f46e5;
      border-bottom: 2px solid #4f46e5;
      padding-top: 12px;
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 60px;
    }
    .footer-note {
      font-size: 12px;
      color: #64748b;
      max-width: 60%;
    }
    .signature-box {
      text-align: center;
      width: 150px;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      height: 40px;
      margin-bottom: 5px;
    }
    .signature-box p {
      margin: 0;
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    .badge-status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-status.active {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-status.inactive {
      background: #fee2e2;
      color: #b91c1c;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-details">
      <h1>IMS Pro</h1>
      <p>Modern Inventory Management System</p>
      <p>Authorized Stock slip receipt</p>
    </div>
    <div style="display: flex; align-items: center; gap: 20px;">
      ${qrCodeUrl ? `
      <div>
        <img src="${qrCodeUrl}" alt="QR Code" style="width: 80px; height: 80px; border: 1px solid #cbd5e1; padding: 4px; border-radius: 6px; display: block;" />
      </div>
      ` : ""}
      <div class="slip-details">
        <h2>Stock Slip</h2>
        <p><strong>Code:</strong> ${item.code || 'N/A'}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
      </div>
    </div>
  </div>

  <div class="bill-to">
    <h3>Item Details & Specifications</h3>
    <p><strong>Warehouse Location:</strong> ${item.warehouse || 'Unassigned'}</p>
    <p><strong>Category Type:</strong> ${item.category_type || 'N/A'}</p>
    <p><strong>Supplier/Vendor:</strong> ${item.supplier || 'N/A'}</p>
  </div>

  <table class="details-table">
    <thead>
      <tr>
        <th>Specification</th>
        <th>Value / Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Item Name</strong></td>
        <td>${item.name}</td>
      </tr>
      <tr>
        <td><strong>Item Category</strong></td>
        <td>${item.category}</td>
      </tr>
      <tr>
        <td><strong>Item Code</strong></td>
        <td>${item.code || 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Supplier</strong></td>
        <td>${item.supplier || 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Status</strong></td>
        <td><span class="badge-status ${item.status === '1' ? 'active' : 'inactive'}">${item.status === '1' ? 'Active' : 'Inactive'}</span></td>
      </tr>
      <tr>
        <td><strong>Quantity in Stock</strong></td>
        <td>${item.quantity} ${item.uom || 'units'}</td>
      </tr>
      <tr>
        <td><strong>Purchase Date</strong></td>
        <td>${item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('en-GB') : 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Bill Number</strong></td>
        <td>${item.billNumber || 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Bill Date</strong></td>
        <td>${item.billDate ? new Date(item.billDate).toLocaleDateString('en-GB') : 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>PO Number</strong></td>
        <td>${item.poNumber || 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Description</strong></td>
        <td>${item.description || 'No description provided.'}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals-box">
    <div class="total-row">
      <span>Unit Price:</span>
      <span>₹ ${Number(item.price).toLocaleString()}</span>
    </div>
    <div class="total-row">
      <span>Quantity:</span>
      <span>${item.quantity} ${item.uom || 'units'}</span>
    </div>
    <div class="total-row">
      <span>Tax Amount ${item.taxSlab ? `(${item.taxSlab})` : ''}:</span>
      <span>₹ ${Number(item.tax || 0).toLocaleString()}</span>
    </div>
    <div class="total-row grand-total">
      <span>Total Valuation:</span>
      <span>₹ ${Number(item.total).toLocaleString()}</span>
    </div>
  </div>

  <div class="footer">
    <div class="footer-note">
      <p><strong>Note:</strong> This is a computer-generated stock slip receipt and is valid for all audit and evaluation purposes. All details are sourced directly from the active database records.</p>
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <p>Warehouse Manager</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    }
  </script>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="view-modal" onClick={(e) => e.stopPropagation()}>

        {/* Close icon */}
        <span className="close-icon" onClick={onClose}>
          ✕
        </span>

        <h4 className="modal-title text-center text-primary">
          <i className="bi bi-info-circle text-primary me-2"></i>
          Item Specifications
        </h4>
        <hr className="separator opacity-25" />

        <div className="modal-body-scroll">
          {/* Header Media Row: Product Image & Asset QR Code side-by-side */}
          <div className="modal-media-row">
            <div className="modal-media-card product-image-card">
              <h5 className="media-card-title">
                <i className="bi bi-image text-primary me-2"></i>
                Product Image
              </h5>
              <div className="image-container-wrapper">
                <img src={getProductImage(item)} alt={item.name} className="product-image-preview" />
              </div>
            </div>

            <div className="modal-media-card qr-code-card">
              <h5 className="media-card-title">
                <i className="bi bi-qr-code text-primary me-2"></i>
                Asset Tag QR Code
              </h5>
              <div className="qr-content-wrapper">
                {qrCodeUrl ? (
                  <div className="qr-image-container">
                    <img 
                      src={qrCodeUrl} 
                      alt="Asset QR Code" 
                      className="qr-img zoomable-qr" 
                      onClick={() => setQrZoomed(true)}
                      title="Click to zoom"
                    />
                    <a
                      href={qrCodeUrl}
                      download={`QR_${item.code || item.name}.png`}
                      className="qr-download-btn"
                    >
                      <i className="bi bi-download me-1"></i>
                      Download QR Tag
                    </a>
                  </div>
                ) : (
                  <p className="text-muted text-center py-2">Generating QR Code...</p>
                )}
              </div>
            </div>
          </div>

          <div className="view-grid">
            <div>
              <label><i className="bi bi-tag text-primary me-1"></i> Name</label>
              <p>{item.name}</p>
            </div>

            <div>
              <label><i className="bi bi-building text-primary me-1"></i> Warehouse</label>
              <p>{item.warehouse || "N/A"}</p>
            </div>

            <div>
              <label><i className="bi bi-diagram-3 text-primary me-1"></i> Type</label>
              <p>{item.category_type}</p>
            </div>

            <div>
              <label><i className="bi bi-folder text-primary me-1"></i> Category</label>
              <p>{item.category}</p>
            </div>

            <div>
              <label><i className="bi bi-box-seam text-primary me-1"></i> Quantity</label>
              <p>{item.quantity} {item.uom || "units"}</p>
            </div>

            <div>
              <label><i className="bi bi-cash text-primary me-1"></i> Price</label>
              <p>₹ {Number(item.price).toLocaleString()}</p>
            </div>

            <div>
              <label><i className="bi bi-percent text-primary me-1"></i> Tax {item.taxSlab ? `(${item.taxSlab})` : ""}</label>
              <p>₹ {Number(item.tax || 0).toLocaleString()}</p>
            </div>

            <div>
              <label><i className="bi bi-wallet2 text-primary me-1"></i> Total Value</label>
              <p className="highlight">₹ {Number(item.total).toLocaleString()}</p>
            </div>

            <div>
              <label><i className="bi bi-person-badge text-primary me-1"></i> Supplier</label>
              <p>{item.supplier}</p>
            </div>

            <div>
              <label><i className="bi bi-barcode text-primary me-1"></i> Code</label>
              <p>{item.code}</p>
            </div>

            <div>
              <label><i className="bi bi-toggle-on text-primary me-1"></i> Status</label>
              <p className={item.status === "1" ? "active" : "inactive"}>
                {item.status === "1" ? "Active" : "Inactive"}
              </p>
            </div>

            <div>
              <label><i className="bi bi-calendar3 text-primary me-1"></i> Added Date</label>
              <p>
                {item.createdDate
                  ? new Date(Number(item.createdDate)).toLocaleDateString("en-GB")
                  : "N/A"}
              </p>
            </div>

            <div>
              <label><i className="bi bi-file-earmark-text text-primary me-1"></i> PO Number</label>
              <p>{item.poNumber || "N/A"}</p>
            </div>

            <div>
              <label><i className="bi bi-calendar2-check text-primary me-1"></i> PO Date</label>
              <p>
                {item.purchaseDate
                  ? new Date(item.purchaseDate).toLocaleDateString("en-GB")
                  : "N/A"}
              </p>
            </div>

            <div>
              <label><i className="bi bi-receipt text-primary me-1"></i> Bill Number</label>
              <p>{item.billNumber || "N/A"}</p>
            </div>

            <div>
              <label><i className="bi bi-calendar2-check text-primary me-1"></i> Bill Date</label>
              <p>
                {item.billDate
                  ? new Date(item.billDate).toLocaleDateString("en-GB")
                  : "N/A"}
              </p>
            </div>

            <div className="full">
              <label><i className="bi bi-file-text text-primary me-1"></i> Description</label>
              <p className="description-text">{item.description || "No description provided."}</p>
            </div>

          </div>

          {/* ⚡ Stock Adjustment Panel */}
          <div className="stock-adjustment-section">
            <button 
              type="button" 
              className={`adjust-toggle-btn ${showAdjust ? "active" : ""}`}
              onClick={() => setShowAdjust(!showAdjust)}
            >
              <i className="bi bi-lightning-charge-fill me-1"></i>
              {showAdjust ? "Hide Adjustment Panel" : "⚡ Quick Stock Adjustment"}
            </button>

            {showAdjust && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const tempErrors = {};
                const qty = Number(adjQty);
                
                if (!adjQty) {
                  tempErrors.qty = "Quantity is required.";
                } else if (isNaN(qty) || qty <= 0) {
                  tempErrors.qty = "Quantity must be a positive number.";
                } else if (adjType === "OUT" && qty > Number(item.quantity || 0)) {
                  tempErrors.qty = `Cannot dispatch more than current stock (${item.quantity}).`;
                }

                if (!adjReason) {
                  tempErrors.reason = "Please select a reason.";
                }

                if (Object.keys(tempErrors).length > 0) {
                  setErrors(tempErrors);
                  return;
                }

                onAdjustStock && onAdjustStock(item.id, qty, adjType, adjReason, adjNotes);
                
                // Reset form fields
                setAdjQty("");
                setAdjNotes("");
                setAdjReason("");
                setErrors({});
                setShowAdjust(false);
              }} className="adjust-form animate-fade-in" noValidate>
                
                <div className="adj-row">
                  <div className="adj-group">
                    <label>Action Type</label>
                    <select value={adjType} onChange={e => { setAdjType(e.target.value); setAdjReason(""); setErrors({}); }} className="adj-select">
                      <option value="IN">📥 Add Stock (Restock)</option>
                      <option value="OUT">📤 Remove Stock (Dispatch)</option>
                    </select>
                  </div>

                  <div className="adj-group">
                    <label>Quantity <span className="req">*</span></label>
                    <input 
                      type="number" 
                      min="1" 
                      placeholder="e.g. 10" 
                      value={adjQty} 
                      onChange={e => {
                        setAdjQty(e.target.value);
                        if (errors.qty) setErrors(prev => { const n = {...prev}; delete n.qty; return n; });
                      }} 
                      className={`adj-input ${errors.qty ? "sinvalid" : ""}`} 
                    />
                    {errors.qty && <span className="serror" style={{ fontSize: "11px", color: "#ef4444", marginTop: "2px", fontWeight: "600" }}>{errors.qty}</span>}
                  </div>

                  <div className="adj-group">
                    <label>Reason <span className="req">*</span></label>
                    <select 
                      value={adjReason} 
                      onChange={e => {
                        setAdjReason(e.target.value);
                        if (errors.reason) setErrors(prev => { const n = {...prev}; delete n.reason; return n; });
                      }} 
                      className={`adj-select ${errors.reason ? "sinvalid" : ""}`}
                    >
                      <option value="">-- Select Reason --</option>
                      {adjType === "IN" ? (
                        <>
                          <option value="Purchase / Restock">Purchase / Restock</option>
                          <option value="Customer Return">Customer Return</option>
                          <option value="Inventory Correction">Inventory Correction</option>
                          <option value="Promo / Gift">Promo / Gift</option>
                        </>
                      ) : (
                        <>
                          <option value="Sales / Dispatch">Sales / Dispatch</option>
                          <option value="Damaged / Broken">Damaged / Broken</option>
                          <option value="Stolen / Lost">Stolen / Lost</option>
                          <option value="Expired Stock">Expired Stock</option>
                          <option value="Promo / Gift">Promo / Gift</option>
                          <option value="Inventory Correction">Inventory Correction</option>
                        </>
                      )}
                    </select>
                    {errors.reason && <span className="serror" style={{ fontSize: "11px", color: "#ef4444", marginTop: "2px", fontWeight: "600" }}>{errors.reason}</span>}
                  </div>
                </div>

                <div className="adj-group full">
                  <label>Adjustment Notes (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Delivered from main vendor invoice #482" 
                    value={adjNotes} 
                    onChange={e => setAdjNotes(e.target.value)} 
                    className="adj-input"
                  />
                </div>

                <div className="adj-actions">
                  <button type="submit" className="adj-submit-btn">Apply Adjustment</button>
                </div>
              </form>
            )}
          </div>



        </div>

        <div className="modal-actions">
          {item.fileAttachment && item.fileAttachment.type === "application/pdf" && (
            <button className="view-pdf-btn" onClick={() => {
              const newTab = window.open();
              if (newTab) {
                newTab.document.write(
                  `<iframe src="${item.fileAttachment.base64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                );
              } else {
                alert("Please allow popups to view the PDF");
              }
            }}>
              <i className="bi bi-file-earmark-pdf me-2"></i> View PDF
            </button>
          )}
          <button className="print-btn" onClick={handlePrint}>
            <i className="bi bi-printer me-2"></i> Print Slip
          </button>
          <button className="close-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {qrZoomed && (
        <div className="qr-zoom-overlay" onClick={() => setQrZoomed(false)}>
          <div className="qr-zoom-modal" onClick={(e) => e.stopPropagation()}>
            <span className="qr-zoom-close" onClick={() => setQrZoomed(false)}>✕</span>
            <h5 className="qr-zoom-title">Asset Tag QR Code</h5>
            <div className="qr-zoom-content">
              <img src={qrCodeUrl} alt="Zoomed QR Code" className="qr-zoom-img" />
              <p className="qr-zoom-code-text">Item Code: <strong>{item.code || "N/A"}</strong></p>
              <p className="qr-zoom-help">Right-click or hold to save, or use the download button below.</p>
              <a
                href={qrCodeUrl}
                download={`QR_${item.code || item.name}.png`}
                className="qr-zoom-download-btn"
              >
                <i className="bi bi-download me-1"></i>
                Download QR Code
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewModal;