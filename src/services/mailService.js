import { activityService } from "./activityService";
import { generatePOPDF } from "./pdfGenerator";

const STORAGE_KEY = "ims_sent_emails";

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
          formData.append("Email Message", body);

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
            body,
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
            Body: body.replace(/\n/g, "<br>"), // Replace newlines with <br> since SMTP.js sends HTML body
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
            body,
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
                message: body,
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
            body,
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
              body,
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
