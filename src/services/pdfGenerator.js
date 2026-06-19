import { jsPDF } from "jspdf";

/**
 * Generates a clean A4 PDF Blob for a Purchase Order document.
 * @param {Object} doc - The Purchase Order document record
 * @returns {Blob} The generated PDF Blob
 */
export const generatePOPDF = (doc) => {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // Color Palette
  const primaryColor = [79, 70, 229]; // Indigo
  const darkText = [15, 23, 42];      // Slate 900
  const lightText = [71, 85, 105];    // Slate 600
  const tableHeaderBg = [241, 245, 249]; // Slate 100

  // 1. Draw Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text("PURCHASE ORDER", 15, 25);

  // Original Stamp
  pdf.setFontSize(9);
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(165, 17, 30, 8);
  pdf.text("ORIGINAL", 180, 22, { align: "center" });

  pdf.line(15, 30, 195, 30);

  // 2. Letterhead Details
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text("IMS Pro Logistics Ltd.", 15, 38);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(lightText[0], lightText[1], lightText[2]);
  pdf.text("Sector 62, Noida Industrial Hub, UP, 201301", 15, 43);
  pdf.text("Email: contact@imspro.logistics.com | Phone: +91-9988776655", 15, 48);
  pdf.text("GSTIN: 09AAAAA1111A1Z1", 15, 53);

  // Document Details (Right aligned metadata)
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text(`PO Number: ${doc.docNumber}`, 130, 38);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(lightText[0], lightText[1], lightText[2]);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return dateStr; }
  };

  pdf.text(`PO Date: ${formatDate(doc.docDate)}`, 130, 43);
  pdf.text(`Due Date: ${formatDate(doc.dueDate)}`, 130, 48);
  pdf.text(`Payment Terms: ${doc.paymentTerms || "Net 30"}`, 130, 53);

  pdf.line(15, 58, 195, 58);

  // 3. Parties Grid (Supplier & Shipping Target)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(lightText[0], lightText[1], lightText[2]);
  pdf.text("ORDER TO (SUPPLIER)", 15, 66);
  pdf.text("SHIP TO / DELIVERY TARGET", 110, 66);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text(doc.partyName, 15, 72);
  pdf.text("IMS Main Warehouse", 110, 72);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(lightText[0], lightText[1], lightText[2]);
  
  // Format long addresses with line splits
  const supAddress = doc.partyAddress || "Registered supplier contact details and warehouse logs are active.";
  const supAddressSplit = pdf.splitTextToSize(supAddress, 80);
  pdf.text(supAddressSplit, 15, 77);

  const shipAddress = doc.shippingAddress || "Sector 62, Noida Industrial Hub, UP, 201301";
  const shipAddressSplit = pdf.splitTextToSize(shipAddress, 80);
  pdf.text(shipAddressSplit, 110, 77);

  pdf.line(15, 98, 195, 98);

  // 4. Line Items Table Headers
  pdf.setFillColor(tableHeaderBg[0], tableHeaderBg[1], tableHeaderBg[2]);
  pdf.rect(15, 104, 180, 8, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text("S.No", 17, 109);
  pdf.text("Description / Item Details", 30, 109);
  pdf.text("Qty", 110, 109, { align: "right" });
  pdf.text("UoM", 125, 109, { align: "right" });
  pdf.text("Price (₹)", 155, 109, { align: "right" });
  pdf.text("Total (₹)", 190, 109, { align: "right" });

  // Draw table contents
  pdf.setFont("helvetica", "normal");
  let y = 118;
  (doc.items || []).forEach((item, idx) => {
    // Print row values
    pdf.text(String(idx + 1), 17, y);
    pdf.text(item.name, 30, y);
    pdf.text(String(item.quantity), 110, y, { align: "right" });
    pdf.text(item.uom || "Pcs", 125, y, { align: "right" });
    pdf.text(item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 155, y, { align: "right" });
    
    const rowTotal = item.totalAmount || (item.quantity * item.price);
    pdf.text(rowTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 190, y, { align: "right" });
    
    // Draw row bottom line
    pdf.setDrawColor(226, 232, 240); // Slate 200
    pdf.line(15, y + 3, 195, y + 3);
    
    y += 8;
  });

  // 5. Summary & Signature Block (Make sure it has space)
  y = Math.max(y, 160) + 5;
  
  pdf.setDrawColor(79, 70, 229);
  pdf.line(15, y, 195, y);
  y += 8;

  // Notes Column (Left)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(lightText[0], lightText[1], lightText[2]);
  pdf.text("Notes & Terms:", 15, y);
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  const termsText = doc.terms || "1. Delivery must be made within 15 days.\n2. Invoice must reference this PO number.";
  const termsSplit = pdf.splitTextToSize(termsText, 100);
  pdf.text(termsSplit, 15, y + 5);

  // Totals Calculations (Right)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(lightText[0], lightText[1], lightText[2]);
  
  pdf.text("Subtotal (Taxable):", 155, y, { align: "right" });
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text(doc.totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 }), 190, y, { align: "right" });
  
  y += 6;
  pdf.setTextColor(lightText[0], lightText[1], lightText[2]);
  pdf.text("CGST Amount (9%):", 155, y, { align: "right" });
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text((doc.totalTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 190, y, { align: "right" });
  
  y += 6;
  pdf.setTextColor(lightText[0], lightText[1], lightText[2]);
  pdf.text("SGST Amount (9%):", 155, y, { align: "right" });
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text((doc.totalTax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 }), 190, y, { align: "right" });
  
  y += 6;
  pdf.line(130, y, 195, y);
  
  y += 6;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text("Grand Total:", 155, y, { align: "right" });
  pdf.text(`INR ${doc.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 190, y, { align: "right" });

  // 6. Signatures at bottom
  y = Math.min(y + 20, 265);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(lightText[0], lightText[1], lightText[2]);
  
  pdf.text("Receiver's Signature", 15, y);
  pdf.line(15, y + 10, 65, y + 10);
  
  pdf.text("For IMS Pro Logistics Ltd.", 195, y, { align: "right" });
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(darkText[0], darkText[1], darkText[2]);
  pdf.text("Authorised Signatory", 195, y + 12, { align: "right" });

  return pdf.output("blob");
};
