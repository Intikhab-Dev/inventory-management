import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import "./SupplierViewModal.css";

const COMM_TEMPLATES = {
  general: {
    label: "General Inquiry",
    emailSubject: (supplierName) => `Inventory Inquiry - IMS Pro (${supplierName})`,
    emailBody: (supplierName) =>
      `Hi ${supplierName},\n\nWe are writing to check the status of our supplier ledger and any updates on pending shipments.\n\nRegards,\nIMS Pro Logistics`,
    waText: (supplierName) =>
      `Hi ${supplierName}, this is IMS Pro. We'd like to check our current inventory shipment status.`
  },
  reorder: {
    label: "Request Stock Reorder",
    emailSubject: (supplierName) => `New Reorder Request - IMS Pro (${supplierName})`,
    emailBody: (supplierName) =>
      `Hi ${supplierName},\n\nWe would like to request a new stock catalog and price list for placing a new Purchase Order.\n\nRegards,\nIMS Pro Logistics`,
    waText: (supplierName) =>
      `Hi ${supplierName}, please send us the latest catalog/price list. We'd like to place a new reorder.`
  },
  payment: {
    label: "Payment / Statement Query",
    emailSubject: (supplierName) => `Payment Statement Inquiry - IMS Pro (${supplierName})`,
    emailBody: (supplierName) =>
      `Hi ${supplierName},\n\nCould you please share the latest statement of account for reconciliation?\n\nRegards,\nIMS Pro Logistics`,
    waText: (supplierName) =>
      `Hi ${supplierName}, could you please share our statement of account? Thank you.`
  }
};

const SupplierViewModal = ({ show, onClose, supplier, items = [] }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrZoomed, setQrZoomed] = useState(false);
  const [commTemplate, setCommTemplate] = useState("general");

  // Filter items linked to this supplier
  const linkedItems = React.useMemo(() => {
    if (!supplier) return [];
    return items.filter(
      (item) =>
        (item.supplier || "").trim().toLowerCase() ===
        (supplier.name || "").trim().toLowerCase()
    );
  }, [supplier, items]);

  useEffect(() => {
    if (!supplier) return;

    // Compile supplier details for QR tag
    const qrText =
      `Supplier Name: ${supplier.name}\n` +
      `Contact Person: ${supplier.contactPerson || "N/A"}\n` +
      `Phone: ${supplier.phone || "N/A"}\n` +
      `Email: ${supplier.email || "N/A"}\n` +
      `GSTIN: ${supplier.gst || "N/A"}\n` +
      `City: ${supplier.city || "N/A"}\n` +
      `Address: ${supplier.address || "N/A"}\n` +
      `Status: ${supplier.status || "active"}\n` +
      `Linked Items: ${linkedItems.length}`;

    QRCode.toDataURL(qrText, { margin: 2, width: 200 })
      .then((url) => {
        setQrCodeUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate QR Code for supplier", err);
      });
  }, [supplier, linkedItems]);

  if (!show || !supplier) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
      alert("Please allow popups to print the supplier slip");
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Supplier Profile Slip - ${supplier.name}</title>
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
    .profile-banner {
      margin-bottom: 25px;
      background: #f8fafc;
      padding: 15px 20px;
      border-radius: 8px;
      border-left: 4px solid #4f46e5;
    }
    .profile-banner h3 {
      margin: 0 0 8px;
      font-size: 14px;
      text-transform: uppercase;
      color: #475569;
      letter-spacing: 0.5px;
    }
    .profile-banner p {
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
    .items-section {
      margin-top: 30px;
    }
    .items-section h3 {
      font-size: 16px;
      color: #1e293b;
      margin-bottom: 12px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
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
  </style>
</head>
<body>
  <div class="header">
    <div class="company-details">
      <h1>IMS Pro</h1>
      <p>Modern Inventory Management System</p>
      <p>Vendor Profile Slip</p>
    </div>
    <div style="display: flex; align-items: center; gap: 20px;">
      ${qrCodeUrl ? `
      <div>
        <img src="${qrCodeUrl}" alt="QR Code" style="width: 80px; height: 80px; border: 1px solid #cbd5e1; padding: 4px; border-radius: 6px; display: block;" />
      </div>
      ` : ""}
      <div class="slip-details">
        <h2>Supplier Slip</h2>
        <p><strong>Status:</strong> ${supplier.status === 'active' ? 'Active' : 'Inactive'}</p>
        <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
      </div>
    </div>
  </div>

  <div class="profile-banner">
    <h3>Supplier Identity</h3>
    <p><strong>Supplier Name:</strong> ${supplier.name}</p>
    <p><strong>GSTIN:</strong> ${supplier.gst || 'N/A'}</p>
    <p><strong>Primary Contact:</strong> ${supplier.contactPerson || 'N/A'}</p>
  </div>

  <table class="details-table">
    <thead>
      <tr>
        <th>Detail Attribute</th>
        <th>Value / Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Supplier Name</strong></td>
        <td>${supplier.name}</td>
      </tr>
      <tr>
        <td><strong>Contact Person</strong></td>
        <td>${supplier.contactPerson || 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Phone Number</strong></td>
        <td>${supplier.phone || 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Email Address</strong></td>
        <td>${supplier.email || 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>GST Number</strong></td>
        <td>${supplier.gst || 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>City</strong></td>
        <td>${supplier.city || 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Full Address</strong></td>
        <td>${supplier.address || 'N/A'}</td>
      </tr>
      <tr>
        <td><strong>Notes/Terms</strong></td>
        <td>${supplier.notes || 'No notes provided.'}</td>
      </tr>
      <tr>
        <td><strong>Linked Items Count</strong></td>
        <td>${linkedItems.length} items linked in active inventory</td>
      </tr>
    </tbody>
  </table>

  ${linkedItems.length > 0 ? `
  <div class="items-section">
    <h3>Linked Inventory Products</h3>
    <table class="details-table" style="font-size: 13px;">
      <thead>
        <tr>
          <th>Code</th>
          <th>Name</th>
          <th>Category</th>
          <th>Warehouse</th>
          <th style="text-align: right;">Quantity</th>
          <th style="text-align: right;">Unit Price</th>
        </tr>
      </thead>
      <tbody>
        ${linkedItems.map(item => `
          <tr>
            <td><code>${item.code}</code></td>
            <td>${item.name}</td>
            <td>${item.category || 'N/A'}</td>
            <td>${item.warehouse || 'N/A'}</td>
            <td style="text-align: right;">${item.quantity} ${item.uom || 'units'}</td>
            <td style="text-align: right;">₹ ${Number(item.price).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <div class="footer-note">
      <p><strong>Note:</strong> This profile slip contains verified information about this supplier as of ${new Date().toLocaleDateString('en-GB')}. Use the QR Code to scan and load records instantly on mobile.</p>
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <p>Authorized Sign</p>
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
          <i className="bi bi-truck text-primary me-2"></i>
          Supplier Details Profile
        </h4>
        <hr className="separator opacity-25" />

        <div className="modal-body-scroll">
          {/* Header Media Row: Avatar & QR Code */}
          <div className="modal-media-row">
            <div className="modal-media-card product-image-card">
              <h5 className="media-card-title">
                <i className="bi bi-person-badge text-primary me-2"></i>
                Supplier Identity
              </h5>
              <div className="supplier-avatar-preview-container">
                <div className="supplier-modal-avatar">
                  {supplier.name.charAt(0).toUpperCase()}
                </div>
                <div className="supplier-avatar-name">{supplier.name}</div>
                <span className={`scard-status ${supplier.status === "active" ? "s-badge-active" : "s-badge-inactive"}`}>
                  {supplier.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="modal-media-card qr-code-card">
              <h5 className="media-card-title">
                <i className="bi bi-qr-code text-primary me-2"></i>
                Supplier QR Code
              </h5>
              <div className="qr-content-wrapper">
                {qrCodeUrl ? (
                  <div className="qr-image-container">
                    <img
                      src={qrCodeUrl}
                      alt="Supplier QR Code"
                      className="qr-img zoomable-qr"
                      onClick={() => setQrZoomed(true)}
                      title="Click to zoom"
                    />
                    <a
                      href={qrCodeUrl}
                      download={`QR_SUPPLIER_${supplier.name.replace(/\s+/g, "_")}.png`}
                      className="qr-download-btn"
                    >
                      <i className="bi bi-download me-1"></i>
                      Download QR
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
              <label>
                <i className="bi bi-person-fill text-primary me-1"></i> Supplier Name
              </label>
              <p>{supplier.name}</p>
            </div>

            <div>
              <label>
                <i className="bi bi-person-bounding-box text-primary me-1"></i> Contact Person
              </label>
              <p>{supplier.contactPerson || "N/A"}</p>
            </div>

            <div>
              <label>
                <i className="bi bi-telephone-fill text-primary me-1"></i> Phone
              </label>
              <p>
                {supplier.phone ? (
                  <a href={`tel:${supplier.phone}`} className="scard-link">
                    {supplier.phone}
                  </a>
                ) : (
                  "N/A"
                )}
              </p>
            </div>

            <div>
              <label>
                <i className="bi bi-envelope-fill text-primary me-1"></i> Email
              </label>
              <p>
                {supplier.email ? (
                  <a href={`mailto:${supplier.email}`} className="scard-link">
                    {supplier.email}
                  </a>
                ) : (
                  "N/A"
                )}
              </p>
            </div>

            <div>
              <label>
                <i className="bi bi-file-earmark-text-fill text-primary me-1"></i> GSTIN
              </label>
              <p>{supplier.gst ? <span className="scard-gst">{supplier.gst}</span> : "N/A"}</p>
            </div>

            <div>
              <label>
                <i className="bi bi-geo-alt-fill text-primary me-1"></i> City
              </label>
              <p>{supplier.city || "N/A"}</p>
            </div>

            <div className="full">
              <label>
                <i className="bi bi-house-door-fill text-primary me-1"></i> Address
              </label>
              <p className="description-text">{supplier.address || "N/A"}</p>
            </div>

            <div>
              <label>
                <i className="bi bi-box-seam-fill text-primary me-1"></i> Linked Items Count
              </label>
              <p className="highlight">{linkedItems.length} products</p>
            </div>

            <div>
              <label>
                <i className="bi bi-calendar-event text-primary me-1"></i> Created Date
              </label>
              <p>
                {supplier.createdAt
                  ? new Date(supplier.createdAt).toLocaleDateString("en-GB")
                  : "N/A"}
              </p>
            </div>

            <div className="full">
              <label>
                <i className="bi bi-journal-text text-primary me-1"></i> Notes / Contract Terms
              </label>
              <p className="description-text italic">{supplier.notes || "No notes provided."}</p>
            </div>
          </div>

          {/* ⚡ Quick Vendor Communications */}
          <div className="supplier-comm-section mt-4">
            <h5 className="media-card-title mb-2">
              <i className="bi bi-chat-left-dots text-primary me-2"></i>
              ⚡ Quick Vendor Communications
            </h5>
            <div className="comm-panel-content">
              <div className="comm-template-selector">
                <label className="comm-label">Choose Message Template:</label>
                <select
                  value={commTemplate}
                  onChange={(e) => setCommTemplate(e.target.value)}
                  className="comm-select"
                >
                  {Object.entries(COMM_TEMPLATES).map(([key, t]) => (
                    <option key={key} value={key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="comm-preview-box">
                <div className="comm-preview-item">
                  <strong>Message Preview:</strong>
                  <p>{COMM_TEMPLATES[commTemplate].waText(supplier.name)}</p>
                </div>
              </div>

              <div className="comm-actions-row">
                <a
                  href={
                    supplier.phone
                      ? `https://wa.me/${supplier.phone.replace(/[^\d+]/g, "")}?text=${encodeURIComponent(COMM_TEMPLATES[commTemplate].waText(supplier.name))}`
                      : "#"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`comm-btn whatsapp-btn ${!supplier.phone ? "disabled" : ""}`}
                  onClick={(e) => {
                    if (!supplier.phone) {
                      e.preventDefault();
                      alert("Please provide a phone number for this supplier to send WhatsApp messages.");
                    }
                  }}
                >
                  <i className="bi bi-whatsapp me-2"></i> WhatsApp Chat
                </a>
                <a
                  href={
                    supplier.email
                      ? `mailto:${supplier.email}?subject=${encodeURIComponent(COMM_TEMPLATES[commTemplate].emailSubject(supplier.name))}&body=${encodeURIComponent(COMM_TEMPLATES[commTemplate].emailBody(supplier.name))}`
                      : "#"
                  }
                  className={`comm-btn email-btn ${!supplier.email ? "disabled" : ""}`}
                  onClick={(e) => {
                    if (!supplier.email) {
                      e.preventDefault();
                      alert("Please provide an email address for this supplier to send inquiries.");
                    }
                  }}
                >
                  <i className="bi bi-envelope-at-fill me-2"></i> Send Email
                </a>
              </div>
            </div>
          </div>

          {/* Linked items breakdown */}
          {linkedItems.length > 0 && (
            <div className="modal-supplier-items-section mt-4">
              <h5 className="media-card-title mb-2">
                <i className="bi bi-list-check text-primary me-2"></i>
                Products Supplied ({linkedItems.length})
              </h5>
              <div className="table-responsive">
                <table className="supplier-modal-items-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Item Name</th>
                      <th>Warehouse</th>
                      <th className="text-end">Stock Qty</th>
                      <th className="text-end">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedItems.map((item) => (
                      <tr key={item.id}>
                        <td><code>{item.code}</code></td>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.warehouse || "Unassigned"}</td>
                        <td className="text-end text-nowrap">{item.quantity} {item.uom || "units"}</td>
                        <td className="text-end">₹ {Number(item.price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="print-btn" onClick={handlePrint}>
            <i className="bi bi-printer me-2"></i> Print Profile Slip
          </button>
          <button className="close-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {qrZoomed && (
        <div className="qr-zoom-overlay" onClick={() => setQrZoomed(false)}>
          <div className="qr-zoom-modal" onClick={(e) => e.stopPropagation()}>
            <span className="qr-zoom-close" onClick={() => setQrZoomed(false)}>
              ✕
            </span>
            <h5 className="qr-zoom-title">Supplier QR Code</h5>
            <div className="qr-zoom-content">
              <img src={qrCodeUrl} alt="Zoomed QR Code" className="qr-zoom-img" />
              <p className="qr-zoom-code-text">
                Supplier: <strong>{supplier.name}</strong>
              </p>
              <p className="qr-zoom-help">Right-click or hold to save, or use the download button below.</p>
              <a
                href={qrCodeUrl}
                download={`QR_SUPPLIER_${supplier.name.replace(/\s+/g, "_")}.png`}
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

export default SupplierViewModal;
