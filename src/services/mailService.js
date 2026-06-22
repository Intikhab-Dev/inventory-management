import { activityService } from "./activityService";
import { generatePOPDF } from "./pdfGenerator";

const STORAGE_KEY = "ims_sent_emails";

/**
 * Generates a clean, premium HTML table of PO items for rich emails (SMTP.js)
 */
const generateItemsHTMLTable = (doc) => {
  if (!doc || !doc.items || doc.items.length === 0) return "";
  
  const formatCurrency = (num) => {
    return typeof num === "number" ? num.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : num;
  };

  const rows = doc.items.map((item, idx) => {
    const rowTotal = item.totalAmount || ((Number(item.quantity) || 0) * (Number(item.price) || 0));
    const itemCode = item.code ? ` (${item.code})` : "";
    const warehouseInfo = item.warehouse ? `<br><small style="color: #64748B; font-size: 11px;">Warehouse: ${item.warehouse}</small>` : "";
    const zebraBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    
    return `
      <tr style="background-color: ${zebraBg};">
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: center; color: #475569; font-weight: 500;">${idx + 1}</td>
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: left; color: #0F172A; font-weight: 500;">
          <span style="font-size: 13px; color: #0F172A; font-weight: 600;">${item.name || "Item"}${itemCode}</span>
          ${warehouseInfo}
        </td>
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: right; color: #0F172A; font-weight: 600;">${item.quantity || 0}</td>
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: center; color: #475569;">${item.uom || "Pcs"}</td>
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: right; color: #0F172A;">₹${formatCurrency(item.price)}</td>
        <td style="padding: 10px 12px; border: 1px solid #cbd5e1; text-align: right; color: #0F172A; font-weight: 600;">₹${formatCurrency(rowTotal)}</td>
      </tr>
    `;
  }).join("");

  const subtotal = formatCurrency(doc.totalTaxable);
  const cgst = formatCurrency((doc.totalTax || 0) / 2);
  const sgst = formatCurrency((doc.totalTax || 0) / 2);
  const grandTotal = formatCurrency(doc.grandTotal);

  return `
    <div style="margin: 20px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px;">
      <h3 style="color: #4F46E5; margin-bottom: 12px; font-size: 15px; border-bottom: 2px solid #4F46E5; padding-bottom: 6px; font-weight: bold; letter-spacing: 0.5px;">ORDER ITEMS SUMMARY</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #94a3b8; font-size: 13px;">
        <thead>
          <tr style="background-color: #4F46E5; color: #ffffff;">
            <th style="padding: 12px 10px; border: 1px solid #94a3b8; text-align: center; font-weight: bold; width: 45px;">S.No</th>
            <th style="padding: 12px 10px; border: 1px solid #94a3b8; text-align: left; font-weight: bold;">Item Description</th>
            <th style="padding: 12px 10px; border: 1px solid #94a3b8; text-align: right; font-weight: bold; width: 60px;">Qty</th>
            <th style="padding: 12px 10px; border: 1px solid #94a3b8; text-align: center; font-weight: bold; width: 55px;">UoM</th>
            <th style="padding: 12px 10px; border: 1px solid #94a3b8; text-align: right; font-weight: bold; width: 90px;">Price</th>
            <th style="padding: 12px 10px; border: 1px solid #94a3b8; text-align: right; font-weight: bold; width: 100px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <!-- Subtotal -->
          <tr>
            <td colspan="4" style="border: 1px solid #cbd5e1; background-color: #f8fafc;"></td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #475569; background-color: #f8fafc;">Subtotal:</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #0F172A; background-color: #f8fafc;">₹${subtotal}</td>
          </tr>
          <!-- CGST -->
          <tr>
            <td colspan="4" style="border: 1px solid #cbd5e1; background-color: #f8fafc;"></td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 500; color: #475569; background-color: #f8fafc;">CGST (9%):</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 500; color: #0F172A; background-color: #f8fafc;">₹${cgst}</td>
          </tr>
          <!-- SGST -->
          <tr>
            <td colspan="4" style="border: 1px solid #cbd5e1; background-color: #f8fafc;"></td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 500; color: #475569; background-color: #f8fafc;">SGST (9%):</td>
            <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 500; color: #0F172A; background-color: #f8fafc;">₹${sgst}</td>
          </tr>
          <!-- Grand Total -->
          <tr style="background-color: #EEF2FF; font-weight: bold;">
            <td colspan="4" style="border: 1px solid #cbd5e1;"></td>
            <td style="padding: 12px 10px; border: 1px solid #cbd5e1; text-align: right; color: #4F46E5; font-size: 14px;">Grand Total:</td>
            <td style="padding: 12px 10px; border: 1px solid #cbd5e1; text-align: right; color: #4F46E5; font-size: 14px;">₹${grandTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
};

/**
 * Generates a clean, readable plain text table of PO items for text-only email interfaces (FormSubmit / EmailJS)
 */
const generateItemsTextTable = (doc) => {
  if (!doc || !doc.items || doc.items.length === 0) return "";
  
  const formatCurrency = (num) => {
    return typeof num === "number" ? num.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : num;
  };

  const header = "S.No | Item Details | Qty | UoM | Price | Total\n" + "--------------------------------------------------\n";
  const rows = doc.items.map((item, idx) => {
    const rowTotal = item.totalAmount || ((Number(item.quantity) || 0) * (Number(item.price) || 0));
    const itemCode = item.code ? ` (${item.code})` : "";
    const warehouseInfo = item.warehouse ? ` [WH: ${item.warehouse}]` : "";
    return `${idx + 1}. ${item.name || "Item"}${itemCode}${warehouseInfo} | ${item.quantity || 0} | ${item.uom || "Pcs"} | ₹${formatCurrency(item.price)} | ₹${formatCurrency(rowTotal)}`;
  }).join("\n");

  const subtotal = `\nSubtotal (Taxable): ₹${formatCurrency(doc.totalTaxable)}`;
  const cgst = `\nCGST (9%): ₹${formatCurrency((doc.totalTax || 0) / 2)}`;
  const sgst = `\nSGST (9%): ₹${formatCurrency((doc.totalTax || 0) / 2)}`;
  const grandTotal = `\nGrand Total: ₹${formatCurrency(doc.grandTotal)}`;

  return "\n\n=== ITEMS SUMMARY ===\n" + header + rows + "\n--------------------------------------------------" + subtotal + cgst + sgst + "\n--------------------------------------------------" + grandTotal;
};

export const mailService = {
  /**
   * Simulates or directly sends an email with a PDF attachment depending on System Settings.
   * @param {Object} emailData - Email options
   * @param {string} emailData.to - Recipient email address
   * @param {string} emailData.subject - Subject line
   * @param {string} emailData.body - Email message body
   * @param {string} emailData.attachmentName - Visual filename of PDF
   * @param {string} emailData.docNumber - Document reference (e.g. PO-12345)
   * @param {number|string} emailData.grandTotal - Total amount of PO
   * @param {string} emailData.sender - Name of the current logged-in user
   * @param {Object} emailData.doc - Complete Purchase Order document object
   * @returns {Promise<Object>} Promise resolving to success status and sent email object
   */
  sendEmail: ({ to, subject, body, attachmentName, docNumber, grandTotal, sender, doc }) => {
    return new Promise(async (resolve, reject) => {
      // 1. Fetch Email configuration settings from localStorage
      let emailConfig = { service: "direct", serviceId: "", templateId: "", publicKey: "" };
      try {
        const saved = localStorage.getItem("email_settings");
        if (saved) {
          emailConfig = JSON.parse(saved);
        }
      } catch (err) {
        console.error("Failed to load email config settings:", err);
      }

      // 2. Choose dispatch method
      if (emailConfig.service === "direct") {
        // Zero-Configuration Direct Sender (FormSubmit.co API with PDF Attachment)
        try {
          // Generate actual PDF Blob from PO data
          const pdfBlob = generatePOPDF(doc);

          // Construct FormData for multipart upload (enables real PDF attachments)
          const formData = new FormData();
          formData.append("attachment", pdfBlob, attachmentName);
          formData.append("_subject", subject.trim());
          formData.append("_captcha", "false"); // Disable spam protection challenge for clean AJAX API dispatch
          formData.append("Purchase Order Number", docNumber);
          formData.append("Grand Total", `₹${grandTotal.toLocaleString("en-IN")}`);
          formData.append("Sender Name", sender || "System");
          
          const textTable = generateItemsTextTable(doc);
          formData.append("Email Message", body + textTable); // Plain text table for FormSubmit message body (stops raw HTML display)


          const response = await fetch(`https://formsubmit.co/ajax/${to.trim()}`, {
            method: "POST",
            body: formData // Sends as multipart/form-data with file binary
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Direct mailer API error: ${errText || response.statusText}`);
          }

          // Save direct send log locally
          const emailLogs = mailService.getEmails();
          const newEmail = {
            id: "EML-" + Math.floor(100000 + Math.random() * 900000),
            timestamp: Date.now(),
            to,
            subject,
            body: body.replace(/\n/g, "<br>") + "<br><br>" + generateItemsHTMLTable(doc), // Stored as HTML for rich rendering inside app log viewer
            attachmentName,
            docNumber,
            grandTotal,
            sender: sender || "System",
            status: "delivered (Direct Mail with PDF)"
          };

          emailLogs.unshift(newEmail);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(emailLogs));

          // Log in system activity stream
          const details = `Directly emailed Purchase Order ${docNumber} (Total: ₹${grandTotal.toLocaleString("en-IN")}) to ${to} with PDF attachment.`;
          activityService.addLog("email_po", details, sender);

          resolve({ success: true, email: newEmail });
        } catch (error) {
          console.error("Failed to send email via Direct Mailer API:", error);
          reject(new Error(`Direct send failed: ${error.message}`));
        }
      } else if (emailConfig.service === "smtp") {
        // Direct SMTP Server dispatch using SMTP.js with REAL PDF Attachment
        const { smtpHost, smtpPort, smtpUsername, smtpPassword, smtpFrom } = emailConfig;

        if (!smtpHost?.trim() || !smtpUsername?.trim() || !smtpPassword?.trim()) {
          reject(new Error("SMTP configurations are incomplete. Please set SMTP Host, Username, and Password in System Settings."));
          return;
        }

        try {
          // Load SMTP.js dynamically if not already present
          if (!window.Email) {
            await new Promise((resolve, reject) => {
              const script = document.createElement("script");
              script.src = "https://smtpjs.com/v3/smtp.js";
              script.onload = () => resolve(true);
              script.onerror = () => reject(new Error("Failed to load SMTP mail engine from secure CDN. Please check your internet connection."));
              document.body.appendChild(script);
            });
          }

          // Generate actual PDF Blob from PO data
          const pdfBlob = generatePOPDF(doc);

          // Convert PDF Blob to Base64 (SMTP.js requires Base64 for attachments)
          const blobToBase64 = (blob) => {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result.split(",")[1]);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          };

          const base64String = await blobToBase64(pdfBlob);

          // Send email using SMTP.js
          const responseText = await window.Email.send({
            Host: smtpHost.trim(),
            Port: smtpPort ? parseInt(smtpPort.trim(), 10) : 587,
            Username: smtpUsername.trim(),
            Password: smtpPassword.trim(),
            To: to.trim(),
            From: (smtpFrom || smtpUsername).trim(),
            Subject: subject.trim(),
            Body: body.replace(/\n/g, "<br>") + "<br><br>" + generateItemsHTMLTable(doc), // SMTP.js sends HTML body, appends beautiful HTML table
            Attachments: [
              {
                name: attachmentName,
                data: base64String
              }
            ]
          });

          if (responseText !== "OK") {
            throw new Error(`SMTP Relay Error: ${responseText}`);
          }

          // Save direct send log locally
          const emailLogs = mailService.getEmails();
          const newEmail = {
            id: "EML-" + Math.floor(100000 + Math.random() * 900000),
            timestamp: Date.now(),
            to,
            subject,
            body: body.replace(/\n/g, "<br>") + "<br><br>" + generateItemsHTMLTable(doc), // Save original body + HTML items table in local logs
            attachmentName,
            docNumber,
            grandTotal,
            sender: sender || "System",
            status: "delivered (Direct SMTP with PDF)"
          };

          emailLogs.unshift(newEmail);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(emailLogs));

          // Log in system activity stream
          const details = `Directly emailed Purchase Order ${docNumber} (Total: ₹${grandTotal.toLocaleString("en-IN")}) to ${to} with actual PDF attachment via SMTP Server.`;
          activityService.addLog("email_po", details, sender);

          resolve({ success: true, email: newEmail });
        } catch (error) {
          console.error("Failed to send email via SMTP Server:", error);
          reject(new Error(`SMTP send failed: ${error.message}`));
        }
      } else if (emailConfig.service === "emailjs") {
        // EmailJS direct dispatch mode
        const { serviceId, templateId, publicKey } = emailConfig;
        
        if (!serviceId.trim() || !templateId.trim() || !publicKey.trim()) {
          reject(new Error("EmailJS configurations are incomplete. Please set Service ID, Template ID, and Public Key in System Settings."));
          return;
        }

        try {
          const textTable = generateItemsTextTable(doc);
          const htmlTable = generateItemsHTMLTable(doc);

          const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              service_id: serviceId.trim(),
              template_id: templateId.trim(),
              user_id: publicKey.trim(),
              template_params: {
                to_email: to.trim(),
                subject: subject.trim(),
                message: body + textTable, // Plain text template parameter to prevent raw HTML leakage
                po_number: docNumber,
                grand_total: `₹${grandTotal.toLocaleString("en-IN")}`,
                sender_name: sender || "System"
              }
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`EmailJS server response error: ${errText || response.statusText}`);
          }

          // Save direct send log locally
          const emailLogs = mailService.getEmails();
          const newEmail = {
            id: "EML-" + Math.floor(100000 + Math.random() * 900000),
            timestamp: Date.now(),
            to,
            subject,
            body: body.replace(/\n/g, "<br>") + "<br><br>" + htmlTable, // Save as HTML for premium local logs display
            attachmentName,
            docNumber,
            grandTotal,
            sender: sender || "System",
            status: "delivered (Direct API)"
          };

          emailLogs.unshift(newEmail);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(emailLogs));

          // Log in system activity stream
          const details = `Directly emailed Purchase Order ${docNumber} (Grand Total: ₹${grandTotal.toLocaleString("en-IN")}) to ${to} via EmailJS.`;
          activityService.addLog("email_po", details, sender);

          resolve({ success: true, email: newEmail });
        } catch (error) {
          console.error("Failed to send email via EmailJS API:", error);
          reject(new Error(`Direct send failed: ${error.message}`));
        }
      } else {
        // Simulation Mode
        setTimeout(() => {
          try {
            const emailLogs = mailService.getEmails();
            
            const newEmail = {
              id: "EML-" + Math.floor(100000 + Math.random() * 900000),
              timestamp: Date.now(),
              to,
              subject,
              body: body.replace(/\n/g, "<br>") + "<br><br>" + generateItemsHTMLTable(doc),
              attachmentName,
              docNumber,
              grandTotal,
              sender: sender || "System",
              status: "delivered"
            };

            emailLogs.unshift(newEmail);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(emailLogs));

            // Log in system activity stream
            const details = `Emailed Purchase Order ${docNumber} (Grand Total: ₹${grandTotal.toLocaleString("en-IN")}) to ${to} with attachment ${attachmentName}.`;
            activityService.addLog("email_po", details, sender);

            resolve({ success: true, email: newEmail });
          } catch (error) {
            console.error("Failed to save mock email:", error);
            reject(new Error("Email dispatch failed. Please try again."));
          }
        }, 1500);
      }
    });
  },

  /**
   * Retrieves all sent email logs.
   * @returns {Array} List of email objects
   */
  getEmails: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to parse email logs:", e);
      return [];
    }
  },

  /**
   * Clears all simulated email logs.
   * @returns {boolean} Success status
   */
  clearEmailLogs: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      console.error("Failed to clear email logs:", e);
      return false;
    }
  }
};
