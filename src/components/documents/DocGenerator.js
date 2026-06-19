import React, { useState, useEffect } from "react";
import { transactionService } from "../../services/transactionService";
import { activityService } from "../../services/activityService";
import { mailService } from "../../services/mailService";
import "./DocGenerator.css";

// Read master lists from Settings
const STORAGE_KEY_SUP = "suppliers";
const STORAGE_KEY_UOM = "customUoms";
const STORAGE_KEY_TAX = "customTaxSlabs";
const STORAGE_KEY_WH = "customWarehouses";
const STORAGE_KEY_CAT = "customCategories";

const DEFAULT_CATEGORIES = ["Electronics", "Furniture", "Stationery", "Tools", "Clothing", "Food", "Medical", "Other"];

const DEFAULT_UOMS = ["Pcs", "Kg", "Ltr", "Box", "Pkt", "Mtr", "Set"];
const DEFAULT_TAX_SLABS = ["GST 0%", "GST 5%", "GST 12%", "GST 18%", "GST 28%"];
const DEFAULT_WAREHOUSES = ["Main Warehouse", "Secondary Warehouse", "Cold Storage"];
const DEFAULT_SUPPLIERS = [
    { id: 1, name: "ABC Traders", status: "active" },
    { id: 2, name: "XYZ Solutions", status: "active" },
    { id: 3, name: "Global Exports", status: "active" }
];

const parseTaxRate = (slabString) => {
    if (!slabString) return 0;
    const match = slabString.match(/(\d+(?:\.\d+)?)\s*%/);
    if (match) return parseFloat(match[1]);
    const numMatch = slabString.match(/(\d+(?:\.\d+)?)/);
    return numMatch ? parseFloat(numMatch[1]) : 0;
};

const detectTaxSlab = (item, slabs) => {
    if (item.taxSlab) return item.taxSlab;
    const qty = Number(item.quantity) || 1;
    const prc = Number(item.price) || 0;
    const tx = Number(item.tax) || 0;
    if (prc > 0 && tx > 0) {
        const rate = (tx / (qty * prc)) * 100;
        const found = slabs.find(slab => Math.abs(parseTaxRate(slab) - rate) < 1.0);
        if (found) return found;
    }
    return "GST 0%";
};

const loadList = (key, defaults) => {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        return Array.isArray(saved) && saved.length > 0 ? saved : defaults;
    } catch { return defaults; }
};

const generateDocNumber = (prefix) => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${rand}`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
        // If it is YYYY-MM-DD format, parse manually to avoid timezone shift
        if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split("-");
            const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
            return date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    } catch {
        return dateStr;
    }
};

const DocGenerator = ({ items, onUpdateItems, currentUser, poPrefill, onClearPrefill, showToast }) => {
    // Dropdowns data
    const [suppliers, setSuppliers] = useState([]);
    const [uoms, setUoms] = useState([]);
    const [taxSlabs, setTaxSlabs] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [categories, setCategories] = useState([]);

    // Document settings
    const [docType, setDocType] = useState("invoice"); // 'invoice' | 'po'
    const [docNumber, setDocNumber] = useState("");
    const [docDate, setDocDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [terms, setTerms] = useState(
        "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within the due date.\n3. Subject to local jurisdiction."
    );

    // Parties
    const [supplierName, setSupplierName] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");

    // Additional B2B & PO fields
    const [customerGst, setCustomerGst] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [paymentMode, setPaymentMode] = useState("UPI");
    const [refPoNumber, setRefPoNumber] = useState("");
    const [shippingAddress, setShippingAddress] = useState("");
    const [paymentTerms, setPaymentTerms] = useState("Net 30");
    const [quoteRef, setQuoteRef] = useState("");

    // Selected Items Cart
    const [selectedItems, setSelectedItems] = useState([]);

    // Adding item form
    const [selectedItemId, setSelectedItemId] = useState("");
    const [itemQty, setItemQty] = useState("");
    const [itemPrice, setItemPrice] = useState("");
    const [itemUom, setItemUom] = useState("Pcs");
    const [itemTaxSlab, setItemTaxSlab] = useState("GST 18%");

    // Custom Item states
    const [customNameInput, setCustomNameInput] = useState("");
    const [customCodeInput, setCustomCodeInput] = useState("");
    const [customWarehouse, setCustomWarehouse] = useState("");
    const [customCategoryType, setCustomCategoryType] = useState("");
    const [customCategory, setCustomCategory] = useState("");
    const [customCurrency, setCustomCurrency] = useState("INR");

    // Sync state
    const [syncInventory, setSyncInventory] = useState(false);

    // Validation errors
    const [errors, setErrors] = useState({});

    // Tabs & History states
    const [activeTab, setActiveTab] = useState("create"); // 'create' | 'history'
    const [savedDocs, setSavedDocs] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("saved_documents")) || [];
        } catch {
            return [];
        }
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all"); // 'all' | 'invoice' | 'po'
    const [previewDoc, setPreviewDoc] = useState(null);
    const [viewingDoc, setViewingDoc] = useState(null);
    const [editingDocId, setEditingDocId] = useState(null);
    const [alertConfig, setAlertConfig] = useState(null);

    // Simulated email service state
    const [emailingDoc, setEmailingDoc] = useState(null);
    const [emailTo, setEmailTo] = useState("");
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailTemplate, setEmailTemplate] = useState("formal");
    const [emailLogs, setEmailLogs] = useState([]);
    const [selectedLogEmail, setSelectedLogEmail] = useState(null);

    // Fetch email logs on mount and when tab changes
    useEffect(() => {
        setEmailLogs(mailService.getEmails());
    }, []);

    useEffect(() => {
        if (activeTab === "email_logs") {
            setEmailLogs(mailService.getEmails());
        }
    }, [activeTab]);

    const getEmailTemplateBody = (templateType, doc) => {
        if (!doc) return "";
        const formattedDate = formatDate(doc.docDate);
        const formattedTotal = doc.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 });
        const senderName = currentUser?.name || "Inventory Manager";

        switch (templateType) {
            case "formal":
                return `Dear ${doc.partyName},\n\nWe are pleased to place our Purchase Order with you. Please find the details below:\n\n- Purchase Order Number: ${doc.docNumber}\n- Order Date: ${formattedDate}\n- Due Date: ${formatDate(doc.dueDate)}\n- Total Order Value: ₹${formattedTotal}\n- Payment Terms: ${doc.paymentTerms || "Net 30"}\n\nThe detailed Purchase Order has been attached to this email as a PDF document (${doc.docNumber}.pdf) for your records.\n\nPlease review the attached document, confirm receipt of this order, and share the estimated delivery timeline.\n\nThank you for your cooperation.\n\nBest regards,\n${senderName}\nIMS Pro Logistics Ltd.`;
            case "reminder":
                return `Dear ${doc.partyName},\n\nThis is a quick follow-up regarding the Purchase Order ${doc.docNumber} sent on ${formattedDate}. Details of the order are:\n\n- Purchase Order Number: ${doc.docNumber}\n- Total Order Value: ₹${formattedTotal}\n- Due Date: ${formatDate(doc.dueDate)}\n\nWe have not yet received confirmation for this order. The detailed PO PDF is attached again for your reference.\n\nCould you please review and confirm the estimated delivery date at your earliest convenience?\n\nThanks and regards,\n${senderName}\nIMS Pro Logistics Ltd.`;
            case "urgent":
                return `URGENT: Purchase Order ${doc.docNumber} - Action Required\n\nDear ${doc.partyName},\n\nWe would like to request priority processing for Purchase Order ${doc.docNumber} (value: ₹${formattedTotal}) which was issued on ${formattedDate}. Details of the order are:\n\n- Purchase Order Number: ${doc.docNumber}\n- Total Order Value: ₹${formattedTotal}\n- Due Date: ${formatDate(doc.dueDate)}\n\nThis order contains critical inventory replenishment items. The complete PO document is attached as a PDF.\n\nPlease process this order on priority and send us the dispatch details and tracking number at the earliest.\n\nThank you for your prompt attention to this matter.\n\nSincerely,\n${senderName}\nIMS Pro Logistics Ltd.`;
            default:
                return "";
        }
    };

    const handleOpenEmailModal = (doc, e) => {
        if (e) e.stopPropagation();
        
        // Find supplier email from directory
        const supplierObj = suppliers.find(s => s.name.trim().toLowerCase() === doc.partyName.trim().toLowerCase()) || {};
        const recipientEmail = doc.supplierEmail || supplierObj.email || "";
        
        setEmailingDoc(doc);
        setEmailTo(recipientEmail);
        setEmailSubject(`Purchase Order ${doc.docNumber} - IMS Pro Logistics Ltd.`);
        setEmailTemplate("formal");
        setEmailBody(getEmailTemplateBody("formal", doc));
        setIsSendingEmail(false);
    };

    const handleTemplateChange = (templateType) => {
        setEmailTemplate(templateType);
        setEmailBody(getEmailTemplateBody(templateType, emailingDoc));
    };

    const handleSendEmail = async (e) => {
        e.preventDefault();
        
        if (!emailTo.trim()) {
            await showCustomAlert("Please enter a recipient email address.");
            return;
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo.trim())) {
            await showCustomAlert("Please enter a valid email address.");
            return;
        }

        if (!emailSubject.trim()) {
            await showCustomAlert("Subject is required.");
            return;
        }

        if (!emailBody.trim()) {
            await showCustomAlert("Email body is required.");
            return;
        }

        setIsSendingEmail(true);
        try {
            await mailService.sendEmail({
                to: emailTo.trim(),
                subject: emailSubject.trim(),
                body: emailBody,
                attachmentName: `${emailingDoc.docNumber}.pdf`,
                docNumber: emailingDoc.docNumber,
                grandTotal: emailingDoc.grandTotal,
                sender: currentUser?.name || "System",
                doc: emailingDoc
            });
            
            setEmailLogs(mailService.getEmails());
            setEmailingDoc(null);
            
            // Check settings to show appropriate success message
            const savedConfig = JSON.parse(localStorage.getItem("email_settings") || "{}");
            let successMessage = `Email simulated and logged in history successfully!`;
            if (savedConfig.service === "emailjs") {
                successMessage = `Direct email successfully dispatched to ${emailTo.trim()} via EmailJS API!`;
            } else if (savedConfig.service === "smtp") {
                successMessage = `Direct email successfully dispatched to ${emailTo.trim()} with actual PDF Purchase Order attachment via SMTP server!`;
            } else if (savedConfig.service === "direct") {
                successMessage = `Direct email successfully dispatched to ${emailTo.trim()} with PDF Purchase Order attachment!`;
            }

            if (showToast) {
                showToast(successMessage);
            } else {
                await showCustomAlert(successMessage);
            }
        } catch (error) {
            await showCustomAlert(error.message || "Failed to send email.");
        } finally {
            setIsSendingEmail(false);
        }
    };

    const showCustomAlert = (msg) => {
        return new Promise((resolve) => {
            setAlertConfig({
                message: msg,
                type: "alert",
                onConfirm: () => {
                    setAlertConfig(null);
                    resolve(true);
                }
            });
        });
    };

    const showCustomConfirm = (msg) => {
        return new Promise((resolve) => {
            setAlertConfig({
                message: msg,
                type: "confirm",
                onConfirm: () => {
                    setAlertConfig(null);
                    resolve(true);
                },
                onCancel: () => {
                    setAlertConfig(null);
                    resolve(false);
                }
            });
        });
    };

    // Generate numeric item codes
    const generateItemCode = () => {
        const rand = Math.floor(100000 + Math.random() * 900000);
        return `ITM-${rand}`;
    };

    // Load master lists and generate doc number
    useEffect(() => {
        setUoms(loadList(STORAGE_KEY_UOM, DEFAULT_UOMS));
        setTaxSlabs(loadList(STORAGE_KEY_TAX, DEFAULT_TAX_SLABS));
        setWarehouses(loadList(STORAGE_KEY_WH, DEFAULT_WAREHOUSES));
        setCategories(loadList(STORAGE_KEY_CAT, DEFAULT_CATEGORIES));
        const savedSuppliers = loadList(STORAGE_KEY_SUP, DEFAULT_SUPPLIERS);
        setSuppliers(savedSuppliers);
        setSupplierName("");

        // Default dates
        const todayStr = new Date().toISOString().split("T")[0];
        setDocDate(todayStr);
        
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        setDueDate(nextMonth.toISOString().split("T")[0]);

        // Initial doc number
        setDocNumber(generateDocNumber("invoice" === docType ? "INV" : "PO"));
    }, []);

    // Prefill Purchase Order when navigated via One-Click Stock Reorder System
    useEffect(() => {
        if (!poPrefill) return;

        setDocType("po");

        // 1. Handle supplier auto-selection & fallback registration
        const targetSupplier = poPrefill.supplier;
        const currentSuppliers = loadList(STORAGE_KEY_SUP, DEFAULT_SUPPLIERS);
        if (targetSupplier) {
            const exists = currentSuppliers.some(s => s.name.trim().toLowerCase() === targetSupplier.trim().toLowerCase());
            if (!exists) {
                const newSup = { id: Date.now() + Math.random(), name: targetSupplier, status: "active" };
                const updatedSups = [newSup, ...currentSuppliers];
                setSuppliers(updatedSups);
                localStorage.setItem(STORAGE_KEY_SUP, JSON.stringify(updatedSups));
            } else {
                setSuppliers(currentSuppliers);
            }
            setSupplierName(targetSupplier);
        } else if (currentSuppliers.length > 0) {
            setSuppliers(currentSuppliers);
            setSupplierName(currentSuppliers[0].name);
        }

        // 2. Add the low stock item to cart with recommended reorder quantity
        const threshold = Number(poPrefill.minThreshold) || 5;
        const currentStock = Number(poPrefill.quantity) || 0;
        const recommendedQty = Math.max(10, (threshold * 2) - currentStock);
        const price = Number(poPrefill.price) || 0;
        const taxSlab = poPrefill.taxSlab || "GST 18%";
        const rate = parseTaxRate(taxSlab);
        const taxable = recommendedQty * price;
        const tax = taxable * (rate / 100);
        const total = taxable + tax;

        const newDocItem = {
            id: Date.now() + "_" + Math.random().toString(36).substring(2, 5),
            itemId: poPrefill.id,
            code: poPrefill.code,
            name: poPrefill.name,
            warehouse: poPrefill.warehouse || "Main Warehouse",
            quantity: recommendedQty,
            uom: poPrefill.uom || "Pcs",
            price: price,
            taxSlab: taxSlab,
            taxableAmount: Math.round(taxable * 100) / 100,
            taxAmount: Math.round(tax * 100) / 100,
            totalAmount: Math.round(total * 100) / 100,
            isCustom: false
        };

        setSelectedItems([newDocItem]);
        setSyncInventory(true);

        // 3. Prefill the left-column "Add Items" form inputs for immediate editing
        setSelectedItemId(String(poPrefill.id));
        setItemQty(String(recommendedQty));
        setItemPrice(String(price));
        setItemUom(poPrefill.uom || "Pcs");
        setItemTaxSlab(taxSlab);

        // Defer clearing prefill state to prevent React render-cycle warnings
        const timer = setTimeout(() => {
            if (onClearPrefill) onClearPrefill();
        }, 0);

        return () => clearTimeout(timer);
    }, [poPrefill, onClearPrefill]);

    // Manual docType change handler
    const handleDocTypeChange = (newType) => {
        if (newType === docType) return;
        setDocType(newType);
        
        // Reset Document Form Inputs
        setSelectedItems([]);
        setCustomerName("");
        setCustomerAddress("");
        setCustomerGst("");
        setCustomerPhone("");
        setCustomerEmail("");
        setPaymentMode("UPI");
        setRefPoNumber("");
        setShippingAddress("");
        setPaymentTerms("Net 30");
        setQuoteRef("");
        
        setSupplierName("");

        // Reset Item Pick fields
        setSelectedItemId("");
        setItemQty("");
        setItemPrice("");
        setItemUom("Pcs");
        setItemTaxSlab("GST 0%");
        setCustomNameInput("");
        setCustomCodeInput("");
        setCustomWarehouse("");
        setCustomCategoryType("");
        setCustomCategory("");
        setCustomCurrency("INR");
        
        // Generate Doc Number and Defaults
        const prefix = newType === "invoice" ? "INV" : "PO";
        setDocNumber(generateDocNumber(prefix));
        setSyncInventory(false);
        setErrors({});
        setEditingDocId(null);
        setTerms(newType === "invoice" 
            ? "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged if payment is not made within the due date.\n3. Subject to local jurisdiction." 
            : "1. Delivery must be made within 15 days of the order date.\n2. Items must match the specifications and UoM ordered.\n3. Invoice must reference this PO number."
        );
    };

    // Switch tabs and reset editor draft state to prevent stuck edit modes
    const handleTabSwitch = (tabName) => {
        if (tabName === activeTab) return;
        
        // Reset Document Form Inputs
        setSelectedItems([]);
        setCustomerName("");
        setCustomerAddress("");
        setCustomerGst("");
        setCustomerPhone("");
        setCustomerEmail("");
        setPaymentMode("UPI");
        setRefPoNumber("");
        setShippingAddress("");
        setPaymentTerms("Net 30");
        setQuoteRef("");
        
        setSupplierName("");

        // Reset Item Pick fields
        setSelectedItemId("");
        setItemQty("");
        setItemPrice("");
        setItemUom("Pcs");
        setItemTaxSlab("GST 0%");
        setCustomNameInput("");
        setCustomCodeInput("");
        setCustomWarehouse("");
        setCustomCategoryType("");
        setCustomCategory("");
        setCustomCurrency("INR");
        
        const prefix = docType === "invoice" ? "INV" : "PO";
        setDocNumber(generateDocNumber(prefix));
        setSyncInventory(false);
        setErrors({});
        setEditingDocId(null);
        setViewingDoc(null);
        setEmailingDoc(null);
        setSelectedLogEmail(null);
        
        setActiveTab(tabName);
    };

    // Handle Item Selection changes to pre-populate details
    const handleItemSelection = (e) => {
        const id = e.target.value;
        setSelectedItemId(id);
        setErrors({});
        
        if (!id) {
            setItemPrice("");
            setItemUom("Pcs");
            setItemTaxSlab("GST 0%");
            return;
        }

        if (id === "custom") {
            setItemPrice("");
            setItemUom("Pcs");
            setItemTaxSlab("GST 18%");
            setCustomNameInput("");
            setCustomCodeInput(generateItemCode());
            setCustomCategoryType("");
            setCustomCategory("");
            setCustomCurrency("INR");
            setCustomWarehouse("");
            return;
        }

        const found = items.find(itm => String(itm.id) === String(id));
        if (found) {
            setItemPrice(found.price || "");
            setItemUom(found.uom || "Pcs");
            setItemTaxSlab(detectTaxSlab(found, taxSlabs));
        }
    };

    // Add item to document list
    const handleAddItem = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!selectedItemId) errs.item = "Please select an item.";
        
        if (selectedItemId === "custom") {
            if (!customNameInput.trim()) errs.customName = "Item Name is required.";
            if (!customCodeInput.trim()) errs.customCode = "Item Code is required.";
            if (!customWarehouse) errs.customWarehouse = "Warehouse is required.";
            if (!customCategoryType) errs.customCategoryType = "Category Type is required.";
            if (!customCategory) errs.customCategory = "Category is required.";
            if (!customCurrency) errs.customCurrency = "Currency is required.";
        }

        if (!itemQty || Number(itemQty) <= 0) errs.qty = "Qty must be greater than 0.";
        if (!itemPrice || Number(itemPrice) < 0) errs.price = "Price cannot be negative.";

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        let newItemName = "";
        let newItemCode = "";
        let newItemWarehouse = "";

        if (selectedItemId === "custom") {
            newItemName = customNameInput.trim();
            newItemCode = customCodeInput.trim();
            newItemWarehouse = customWarehouse;

            // Check if item code already exists in catalog
            const codeExists = items.some(itm => itm.code.trim().toLowerCase() === newItemCode.toLowerCase());
            if (codeExists) {
                const confirmed = await showCustomConfirm(`An item with Code "${newItemCode}" already exists in stock. Do you want to add it as a new line anyway?`);
                if (!confirmed) {
                    return;
                }
            }
        } else {
            const product = items.find(itm => String(itm.id) === String(selectedItemId));
            if (!product) return;
            newItemName = product.name;
            newItemCode = product.code;
            newItemWarehouse = product.warehouse;

            // Check stock availability if Invoice
            if (docType === "invoice") {
                const currentStock = Number(product.quantity) || 0;
                const alreadyAdded = selectedItems
                    .filter(item => item.code === product.code)
                    .reduce((acc, curr) => acc + curr.quantity, 0);

                if (alreadyAdded + Number(itemQty) > currentStock) {
                    const confirmed = await showCustomConfirm(`Warning: Invoiced quantity (${alreadyAdded + Number(itemQty)}) exceeds current stock in warehouse (${currentStock} ${product.uom || 'units'}). Do you still want to add it?`);
                    if (!confirmed) {
                        return;
                    }
                }
            }
        }

        const qty = Number(itemQty);
        const price = Number(itemPrice);
        const rate = parseTaxRate(itemTaxSlab);
        const taxable = qty * price;
        const tax = taxable * (rate / 100);
        const total = taxable + tax;

        const newDocItem = {
            id: Date.now() + "_" + Math.random().toString(36).substring(2, 5),
            itemId: selectedItemId === "custom" ? "custom" : selectedItemId,
            code: newItemCode,
            name: newItemName,
            warehouse: newItemWarehouse,
            quantity: qty,
            uom: itemUom,
            price: price,
            taxSlab: itemTaxSlab,
            taxableAmount: Math.round(taxable * 100) / 100,
            taxAmount: Math.round(tax * 100) / 100,
            totalAmount: Math.round(total * 100) / 100,
            isCustom: selectedItemId === "custom",
            ...(selectedItemId === "custom" && {
                category_type: customCategoryType,
                category: customCategory,
                currency: customCurrency
            })
        };

        setSelectedItems([...selectedItems, newDocItem]);
        
        // Reset Item fields
        setSelectedItemId("");
        setItemQty("");
        setItemPrice("");
        setCustomNameInput("");
        setCustomCodeInput("");
        setCustomCategoryType("");
        setCustomCategory("");
        setCustomCurrency("INR");
        setErrors({});
    };

    // Remove item from doc list
    const handleRemoveItem = (id) => {
        setSelectedItems(selectedItems.filter(item => item.id !== id));
    };

    // Calculations for totals
    const totalTaxable = selectedItems.reduce((acc, curr) => acc + curr.taxableAmount, 0);
    const totalTax = selectedItems.reduce((acc, curr) => acc + curr.taxAmount, 0);
    const grandTotal = selectedItems.reduce((acc, curr) => acc + curr.totalAmount, 0);

    // CGST and SGST split (50-50 of total tax)
    const cgstAmount = Math.round((totalTax / 2) * 100) / 100;
    const sgstAmount = Math.round((totalTax / 2) * 100) / 100;

    // Trigger standard system printing
    const handlePrint = () => {
        window.print();
    };

    const handleReset = async () => {
        const confirmed = await showCustomConfirm("Are you sure you want to clear all fields?");
        if (confirmed) {
            setSelectedItems([]);
            setCustomerName("");
            setCustomerAddress("");
            setCustomerGst("");
            setCustomerPhone("");
            setCustomerEmail("");
            setPaymentMode("UPI");
            setRefPoNumber("");
            setShippingAddress("");
            setPaymentTerms("Net 30");
            setQuoteRef("");
            setSupplierName("");
            const prefix = docType === "invoice" ? "INV" : "PO";
            setDocNumber(generateDocNumber(prefix));
            setSyncInventory(false);
            setErrors({});
            setEditingDocId(null);
        }
    };

    // Save and Sync Inventory handler
    const handleSaveDocument = async (e) => {
        if (e) e.preventDefault();
        
        if (selectedItems.length === 0) {
            await showCustomAlert("Please add at least one item to the document.");
            return;
        }

        if (!docDate) {
            await showCustomAlert("Please enter Document Date.");
            return;
        }

        if (!dueDate) {
            await showCustomAlert("Please enter Due Date.");
            return;
        }

        if (dueDate < docDate) {
            await showCustomAlert(`Due Date cannot be earlier than ${docType === "po" ? "PO Date" : "Invoice Date"}.`);
            return;
        }

        if (docType === "po" && !supplierName) {
            setErrors(prev => ({ ...prev, supplier: "Supplier selection is required." }));
            await showCustomAlert("Please select a Supplier.");
            return;
        }

        if (docType === "invoice") {
            if (!customerName.trim()) {
                await showCustomAlert("Please enter Customer Name.");
                return;
            }
            if (!customerPhone.trim()) {
                await showCustomAlert("Please enter Customer Phone Number.");
                return;
            }
            if (!customerAddress.trim()) {
                await showCustomAlert("Please enter Customer Address.");
                return;
            }
        }

        const selectedSupObj = docType === "po" ? suppliers.find(s => s.name === supplierName) : null;

        // Post updates to catalog inventory & log in ledger
        if (syncInventory) {
            let inventoryCopy = [...items];

            selectedItems.forEach(docItem => {
                if (docItem.isCustom) {
                    // Create new item in catalog
                    const newItem = {
                        id: Date.now() + Math.floor(Math.random() * 10000),
                        name: docItem.name,
                        code: docItem.code,
                        warehouse: docItem.warehouse,
                        category_type: docItem.category_type || "Consumable",
                        category: docItem.category || "Other",
                        quantity: docType === "po" ? docItem.quantity : 0,
                        minThreshold: "5",
                        currency: docItem.currency || "INR",
                        price: docItem.price,
                        uom: docItem.uom,
                        taxSlab: docItem.taxSlab,
                        taxableAmount: docItem.taxableAmount,
                        tax: docItem.taxAmount,
                        total: docItem.totalAmount,
                        supplier: docType === "po" ? supplierName : "Direct Customer",
                        status: "1",
                        description: `Auto-created from PO #${docNumber}`,
                        purchaseDate: docDate,
                        billNumber: docNumber,
                        billDate: docDate,
                        poNumber: docType === "po" ? docNumber : "",
                        createdDate: Date.now()
                    };
                    
                    inventoryCopy.push(newItem);

                    // Add log to transaction ledger
                    transactionService.addTransaction({
                        itemId: docItem.code,
                        itemName: docItem.name,
                        type: docType === "po" ? "IN" : "OUT",
                        qty: docItem.quantity,
                        reason: docType === "po" ? "Purchase Order Received (New Item)" : "Sales Invoice Dispatched",
                        notes: docType === "po" 
                            ? `PO #${docNumber} (Supplier: ${supplierName})` 
                            : `Invoice #${docNumber} (Customer: ${customerName})`,
                        user: currentUser?.name || "System"
                    });
                } else {
                    // Existing item
                    const targetIdx = inventoryCopy.findIndex(i => String(i.id) === String(docItem.itemId));
                    if (targetIdx !== -1) {
                        const currentQty = Number(inventoryCopy[targetIdx].quantity) || 0;
                        let nextQty = currentQty;

                        if (docType === "po") {
                            nextQty = currentQty + docItem.quantity;
                        } else {
                            nextQty = Math.max(0, currentQty - docItem.quantity);
                        }

                        inventoryCopy[targetIdx] = {
                            ...inventoryCopy[targetIdx],
                            quantity: nextQty,
                            total: nextQty * (Number(inventoryCopy[targetIdx].price) || 0)
                        };

                        // Add log to transaction ledger
                        transactionService.addTransaction({
                            itemId: docItem.code,
                            itemName: docItem.name,
                            type: docType === "po" ? "IN" : "OUT",
                            qty: docItem.quantity,
                            reason: docType === "po" ? "Purchase Order Received" : "Sales Invoice Dispatched",
                            notes: docType === "po" 
                                ? `PO #${docNumber} (Supplier: ${supplierName})` 
                                : `Invoice #${docNumber} (Customer: ${customerName})`,
                            user: currentUser?.name || "System"
                        });
                    }
                }
            });

            onUpdateItems(inventoryCopy);
            activityService.addLog(
                "update_item",
                `Processed ${docType.toUpperCase()} #${docNumber} with ${selectedItems.length} items. Inventory quantities synced.`,
                currentUser?.name
            );
        } else {
            // Log only activity without changing quantities
            activityService.addLog(
                "other",
                `Generated ${docType.toUpperCase()} #${docNumber} for ${docType === "po" ? supplierName : customerName} (Total: ₹${grandTotal.toLocaleString()}).`,
                currentUser?.name
            );
        }

        const existingDocs = JSON.parse(localStorage.getItem("saved_documents")) || [];
        
        let updatedDocs;
        if (editingDocId) {
            // Update the existing document record in history
            updatedDocs = existingDocs.map(d => {
                if (d.id === editingDocId) {
                    return {
                        ...d,
                        docNumber,
                        docDate,
                        dueDate,
                        partyName: docType === "po" ? supplierName : customerName,
                        partyAddress: docType === "po" ? (suppliers.find(s => s.name === supplierName)?.address || "") : customerAddress,
                        customerGst: docType === "invoice" ? customerGst : "",
                        customerPhone: docType === "invoice" ? customerPhone : "",
                        customerEmail: docType === "invoice" ? customerEmail : "",
                        paymentMode: docType === "invoice" ? paymentMode : "",
                        refPoNumber: docType === "invoice" ? refPoNumber : "",
                        shippingAddress: docType === "po" ? shippingAddress : "",
                        paymentTerms: docType === "po" ? paymentTerms : "Net 30",
                        quoteRef: docType === "po" ? quoteRef : "",
                        supplierContactPerson: selectedSupObj ? (selectedSupObj.contactPerson || "") : "",
                        supplierPhone: selectedSupObj ? (selectedSupObj.phone || "") : "",
                        supplierEmail: selectedSupObj ? (selectedSupObj.email || "") : "",
                        supplierGst: selectedSupObj ? (selectedSupObj.gst || "") : "",
                        supplierCity: selectedSupObj ? (selectedSupObj.city || "") : "",
                        items: [...selectedItems],
                        terms,
                        totalTaxable,
                        totalTax,
                        grandTotal,
                        status: syncInventory ? "Done" : "Pending"
                    };
                }
                return d;
            });
            setEditingDocId(null);
        } else {
            // Compile new document record for history registry (supporting both Invoice & PO)
            const newDocRecord = {
                id: "doc_" + Date.now(),
                docType,
                docNumber,
                docDate,
                dueDate,
                partyName: docType === "po" ? supplierName : customerName,
                partyAddress: docType === "po" ? (suppliers.find(s => s.name === supplierName)?.address || "") : customerAddress,
                customerGst: docType === "invoice" ? customerGst : "",
                customerPhone: docType === "invoice" ? customerPhone : "",
                customerEmail: docType === "invoice" ? customerEmail : "",
                paymentMode: docType === "invoice" ? paymentMode : "",
                refPoNumber: docType === "invoice" ? refPoNumber : "",
                shippingAddress: docType === "po" ? shippingAddress : "",
                paymentTerms: docType === "po" ? paymentTerms : "Net 30",
                quoteRef: docType === "po" ? quoteRef : "",
                supplierContactPerson: selectedSupObj ? (selectedSupObj.contactPerson || "") : "",
                supplierPhone: selectedSupObj ? (selectedSupObj.phone || "") : "",
                supplierEmail: selectedSupObj ? (selectedSupObj.email || "") : "",
                supplierGst: selectedSupObj ? (selectedSupObj.gst || "") : "",
                supplierCity: selectedSupObj ? (selectedSupObj.city || "") : "",
                items: [...selectedItems],
                terms,
                totalTaxable,
                totalTax,
                grandTotal,
                createdTimestamp: Date.now(),
                status: syncInventory ? "Done" : "Pending"
            };
            updatedDocs = [newDocRecord, ...existingDocs];
        }

        localStorage.setItem("saved_documents", JSON.stringify(updatedDocs));
        setSavedDocs(updatedDocs);

        await showCustomAlert(`${docType === "po" ? "Purchase Order" : "Invoice"} #${docNumber} saved successfully!`);
        
        // Reset
        setSelectedItems([]);
        setCustomerName("");
        setCustomerAddress("");
        setCustomerGst("");
        setCustomerPhone("");
        setCustomerEmail("");
        setPaymentMode("UPI");
        setRefPoNumber("");
        setShippingAddress("");
        setPaymentTerms("Net 30");
        setQuoteRef("");
        const prefix = docType === "invoice" ? "INV" : "PO";
        setDocNumber(generateDocNumber(prefix));
        setSyncInventory(false);
        setErrors({});
    };

    // Filter and search history logic
    const filteredDocs = savedDocs.filter(doc => {
        const matchesType = filterType === "all" || doc.docType === filterType;
        const matchesQuery = !searchQuery.trim() || 
            doc.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.partyName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesQuery;
    });

    const handleDeleteDoc = async (id, e) => {
        e.stopPropagation();
        const confirmed = await showCustomConfirm("Are you sure you want to delete this document from history?");
        if (confirmed) {
            const updated = savedDocs.filter(d => d.id !== id);
            localStorage.setItem("saved_documents", JSON.stringify(updated));
            setSavedDocs(updated);
        }
    };

    const handleClearAllHistory = async () => {
        const confirmed = await showCustomConfirm("Are you sure you want to permanently delete ALL saved documents from your history? This action cannot be undone.");
        if (confirmed) {
            localStorage.removeItem("saved_documents");
            setSavedDocs([]);
            await showCustomAlert("All saved document history has been cleared.");
        }
    };

    const handleLoadDocToEditor = async (doc, e) => {
        e.stopPropagation();
        const confirmed = await showCustomConfirm("Loading this document will overwrite your current draft in the editor. Do you want to proceed?");
        if (confirmed) {
            setDocType(doc.docType);
            setDocNumber(doc.docNumber);
            setDocDate(doc.docDate);
            setDueDate(doc.dueDate);
            if (doc.docType === "po") {
                setSupplierName(doc.partyName);
                setShippingAddress(doc.shippingAddress || "");
                setPaymentTerms(doc.paymentTerms || "Net 30");
                setQuoteRef(doc.quoteRef || "");
                // Reset customer fields to empty to be safe
                setCustomerName("");
                setCustomerAddress("");
                setCustomerGst("");
                setCustomerPhone("");
                setCustomerEmail("");
                setPaymentMode("UPI");
                setRefPoNumber("");
            } else {
                setCustomerName(doc.partyName);
                setCustomerAddress(doc.partyAddress || "");
                setCustomerGst(doc.customerGst || "");
                setCustomerPhone(doc.customerPhone || "");
                setCustomerEmail(doc.customerEmail || "");
                setPaymentMode(doc.paymentMode || "UPI");
                setRefPoNumber(doc.refPoNumber || "");
                // Reset PO fields
                setShippingAddress("");
                setPaymentTerms("Net 30");
                setQuoteRef("");
            }
            setSelectedItems(doc.items || []);
            setTerms(doc.terms || "");
            setSyncInventory(false); // don't auto-sync by default when re-editing
            setEditingDocId(doc.id); // set edit mode!
            setActiveTab("create");
        }
    };

    const handleMarkDocDone = async (doc, e) => {
        if (e) e.stopPropagation();

        if (doc.status === "Done") {
            await showCustomAlert("This document is already marked as Done.");
            return;
        }

        const confirmMsg = `Are you sure you want to mark ${doc.docType === "po" ? "Purchase Order" : "Invoice"} #${doc.docNumber} as Done?\nThis will adjust inventory quantities and log transactions in the stock ledger.`;
        const confirmed = await showCustomConfirm(confirmMsg);
        if (!confirmed) return;

        let inventoryCopy = [...items];
        let hasError = false;

        for (const docItem of doc.items) {
            if (docItem.isCustom) {
                // Check if it already exists by code
                const existingIdx = inventoryCopy.findIndex(i => String(i.code).trim().toLowerCase() === String(docItem.code).trim().toLowerCase());
                if (existingIdx !== -1) {
                    const currentQty = Number(inventoryCopy[existingIdx].quantity) || 0;
                    const nextQty = doc.docType === "po" ? currentQty + docItem.quantity : Math.max(0, currentQty - docItem.quantity);
                    inventoryCopy[existingIdx] = {
                        ...inventoryCopy[existingIdx],
                        quantity: nextQty,
                        total: nextQty * (Number(inventoryCopy[existingIdx].price) || 0)
                    };
                    
                    transactionService.addTransaction({
                        itemId: docItem.code,
                        itemName: docItem.name,
                        type: doc.docType === "po" ? "IN" : "OUT",
                        qty: docItem.quantity,
                        reason: doc.docType === "po" ? "Purchase Order Received" : "Sales Invoice Dispatched",
                        notes: doc.docType === "po" 
                            ? `PO #${doc.docNumber} (Supplier: ${doc.partyName})` 
                            : `Invoice #${doc.docNumber} (Customer: ${doc.partyName})`,
                        user: currentUser?.name || "System"
                    });
                } else {
                    // Create new item in catalog
                    const newItem = {
                        id: Date.now() + Math.floor(Math.random() * 10000),
                        name: docItem.name,
                        code: docItem.code,
                        warehouse: docItem.warehouse || "Main Warehouse",
                        category_type: docItem.category_type || "Consumable",
                        category: docItem.category || "Other",
                        quantity: doc.docType === "po" ? docItem.quantity : 0,
                        minThreshold: "5",
                        currency: docItem.currency || "INR",
                        price: docItem.price,
                        uom: docItem.uom,
                        taxSlab: docItem.taxSlab,
                        taxableAmount: docItem.taxableAmount,
                        tax: docItem.taxAmount,
                        total: docItem.totalAmount,
                        supplier: doc.docType === "po" ? doc.partyName : "Direct Customer",
                        status: "1",
                        description: `Auto-created from PO #${doc.docNumber}`,
                        purchaseDate: doc.docDate,
                        billNumber: doc.docNumber,
                        billDate: doc.docDate,
                        poNumber: doc.docType === "po" ? doc.docNumber : "",
                        createdDate: Date.now()
                    };
                    inventoryCopy.push(newItem);

                    transactionService.addTransaction({
                        itemId: docItem.code,
                        itemName: docItem.name,
                        type: doc.docType === "po" ? "IN" : "OUT",
                        qty: docItem.quantity,
                        reason: doc.docType === "po" ? "Purchase Order Received (New Item)" : "Sales Invoice Dispatched",
                        notes: doc.docType === "po" 
                            ? `PO #${doc.docNumber} (Supplier: ${doc.partyName})` 
                            : `Invoice #${doc.docNumber} (Customer: ${doc.partyName})`,
                        user: currentUser?.name || "System"
                    });
                }
            } else {
                // Existing item
                const targetIdx = inventoryCopy.findIndex(i => String(i.id) === String(docItem.itemId));
                if (targetIdx !== -1) {
                    const currentQty = Number(inventoryCopy[targetIdx].quantity) || 0;
                    let nextQty = currentQty;

                    if (doc.docType === "po") {
                        nextQty = currentQty + docItem.quantity;
                    } else {
                        nextQty = Math.max(0, currentQty - docItem.quantity);
                    }

                    inventoryCopy[targetIdx] = {
                        ...inventoryCopy[targetIdx],
                        quantity: nextQty,
                        total: nextQty * (Number(inventoryCopy[targetIdx].price) || 0)
                    };

                    transactionService.addTransaction({
                        itemId: docItem.code,
                        itemName: docItem.name,
                        type: doc.docType === "po" ? "IN" : "OUT",
                        qty: docItem.quantity,
                        reason: doc.docType === "po" ? "Purchase Order Received" : "Sales Invoice Dispatched",
                        notes: doc.docType === "po" 
                            ? `PO #${doc.docNumber} (Supplier: ${doc.partyName})` 
                            : `Invoice #${doc.docNumber} (Customer: ${doc.partyName})`,
                        user: currentUser?.name || "System"
                    });
                } else {
                    // Try to find by code if id changed
                    const backupIdx = inventoryCopy.findIndex(i => String(i.code).trim().toLowerCase() === String(docItem.code).trim().toLowerCase());
                    if (backupIdx !== -1) {
                        const currentQty = Number(inventoryCopy[backupIdx].quantity) || 0;
                        const nextQty = doc.docType === "po" ? currentQty + docItem.quantity : Math.max(0, currentQty - docItem.quantity);
                        
                        inventoryCopy[backupIdx] = {
                            ...inventoryCopy[backupIdx],
                            quantity: nextQty,
                            total: nextQty * (Number(inventoryCopy[backupIdx].price) || 0)
                        };
                        
                        transactionService.addTransaction({
                            itemId: docItem.code,
                            itemName: docItem.name,
                            type: doc.docType === "po" ? "IN" : "OUT",
                            qty: docItem.quantity,
                            reason: doc.docType === "po" ? "Purchase Order Received" : "Sales Invoice Dispatched",
                            notes: doc.docType === "po" 
                                ? `PO #${doc.docNumber} (Supplier: ${doc.partyName})` 
                                : `Invoice #${doc.docNumber} (Customer: ${doc.partyName})`,
                            user: currentUser?.name || "System"
                        });
                    } else {
                        await showCustomAlert(`Item "${docItem.name}" (Code: ${docItem.code}) not found in inventory! Cannot adjust stock.`);
                        hasError = true;
                    }
                }
            }
        }

        if (hasError) return;

        onUpdateItems(inventoryCopy);

        const updated = savedDocs.map(d => {
            if (d.id === doc.id) {
                return { ...d, status: "Done" };
            }
            return d;
        });

        localStorage.setItem("saved_documents", JSON.stringify(updated));
        setSavedDocs(updated);

        activityService.addLog(
            "update_item",
            `Marked ${doc.docType.toUpperCase()} #${doc.docNumber} as Done. Inventory quantities synced.`,
            currentUser?.name
        );

        await showCustomAlert(`${doc.docType === "po" ? "Purchase Order" : "Invoice"} #${doc.docNumber} marked as Done successfully!`);
    };

    return (
        <div className="doc-page-container">
            {/* Top Navigation Tabs */}
            <div className="doc-page-tabs no-print">
                <button
                    type="button"
                    className={`page-tab-btn ${activeTab === "create" ? "active" : ""}`}
                    onClick={() => handleTabSwitch("create")}
                >
                    <i className="bi bi-file-earmark-plus-fill me-2"></i> Create Document
                </button>
                <button
                    type="button"
                    className={`page-tab-btn ${activeTab === "history" ? "active" : ""}`}
                    onClick={() => handleTabSwitch("history")}
                >
                    <i className="bi bi-folder-fill me-2"></i> Saved Documents History ({savedDocs.length})
                </button>
                <button
                    type="button"
                    className={`page-tab-btn ${activeTab === "email_logs" ? "active" : ""}`}
                    onClick={() => handleTabSwitch("email_logs")}
                >
                    <i className="bi bi-envelope-paper-fill me-2"></i> Email Logs ({emailLogs.length})
                </button>
            </div>

            {activeTab === "create" && (
                <div className="doc-wrapper">
            {/* Left Column: Input Form (Form Editor) */}
            <div className="form-editor-panel no-print">
                <div className="doc-section-card">
                    {editingDocId && (
                        <div className="editing-indicator mb-3 text-warning" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                            <i className="bi bi-pencil-square"></i> Editing Document: {docNumber} (Saving will update the existing entry)
                        </div>
                    )}
                    <div className="doc-type-toggle">
                        <button
                            type="button"
                            className={`toggle-btn ${docType === "invoice" ? "active" : ""}`}
                            onClick={() => handleDocTypeChange("invoice")}
                        >
                            <i className="bi bi-receipt-cutoff me-1"></i> Sales Invoice
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn ${docType === "po" ? "active" : ""}`}
                            onClick={() => handleDocTypeChange("po")}
                        >
                            <i className="bi bi-cart-check-fill me-1"></i> Purchase Order (PO)
                        </button>
                    </div>

                    <form className="doc-meta-grid" onSubmit={(e) => e.preventDefault()}>
                        <div className="form-group">
                            <label className="form-label">Doc Number</label>
                            <input
                                type="text"
                                className="form-input readonly-input"
                                value={docNumber}
                                readOnly
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">{docType === "po" ? "PO Date" : "Invoice Date"} <span className="required-star">*</span></label>
                            <input
                                type="date"
                                className="form-input"
                                value={docDate}
                                onChange={(e) => {
                                    const nextDocDate = e.target.value;
                                    setDocDate(nextDocDate);
                                    if (dueDate && dueDate < nextDocDate) {
                                        setDueDate(nextDocDate);
                                    }
                                }}
                                onClick={(e) => {
                                    if (typeof e.target.showPicker === "function") {
                                        try { e.target.showPicker(); } catch (err) {}
                                    }
                                }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Due Date <span className="required-star">*</span></label>
                            <input
                                type="date"
                                className="form-input"
                                value={dueDate}
                                min={docDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                onClick={(e) => {
                                    if (typeof e.target.showPicker === "function") {
                                        try { e.target.showPicker(); } catch (err) {}
                                    }
                                }}
                            />
                        </div>

                        {docType === "po" ? (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Supplier <span className="required-star">*</span></label>
                                    <select
                                        className={`form-input ${errors.supplier ? "is-invalid" : ""}`}
                                        value={supplierName}
                                        onChange={(e) => {
                                            setSupplierName(e.target.value);
                                            if (errors.supplier) {
                                                setErrors(prev => ({ ...prev, supplier: null }));
                                            }
                                        }}
                                    >
                                        <option value="">-- Select Supplier --</option>
                                        {suppliers.map(sup => (
                                            <option key={sup.id || sup.name} value={sup.name}>
                                                {sup.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.supplier && <span className="error-text">{errors.supplier}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Quote Reference</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. QT-93802"
                                        value={quoteRef}
                                        onChange={(e) => setQuoteRef(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Terms</label>
                                    <select
                                        className="form-input"
                                        value={paymentTerms}
                                        onChange={(e) => setPaymentTerms(e.target.value)}
                                    >
                                        <option value="Immediate">Immediate</option>
                                        <option value="Net 15">Net 15 Days</option>
                                        <option value="Net 30">Net 30 Days</option>
                                        <option value="COD">Cash on Delivery (COD)</option>
                                        <option value="Advance">Advance Payment</option>
                                    </select>
                                </div>
                                <div className="form-group full-row">
                                    <label className="form-label">Shipping / Delivery Address</label>
                                    <textarea
                                        className="form-input form-textarea-mini"
                                        placeholder="Enter target warehouse shipping destination"
                                        value={shippingAddress}
                                        onChange={(e) => setShippingAddress(e.target.value)}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Customer Name <span className="required-star">*</span></label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter customer name"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Customer GSTIN</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. 09AAAAA1111A1Z1"
                                        value={customerGst}
                                        onChange={(e) => setCustomerGst(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Customer Phone <span className="required-star">*</span></label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. +91 9988776655"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Customer Email</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="e.g. client@example.com"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Mode</label>
                                    <select
                                        className="form-input"
                                        value={paymentMode}
                                        onChange={(e) => setPaymentMode(e.target.value)}
                                    >
                                        <option value="UPI">UPI / GPay</option>
                                        <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Card">Credit/Debit Card</option>
                                    </select>
                                </div>
                                <div className="form-group full-row">
                                    <label className="form-label">Customer Address <span className="required-star">*</span></label>
                                    <textarea
                                        className="form-input form-textarea-mini"
                                        placeholder="Enter customer billing address"
                                        value={customerAddress}
                                        onChange={(e) => setCustomerAddress(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                    </form>
                </div>

                <div className="doc-section-card">
                    {/* Cart Selector Panel */}
                    <h5 className="section-card-title">
                        <i className="bi bi-plus-circle-fill text-primary me-2"></i> Add Items
                    </h5>
                    <form onSubmit={handleAddItem} className="item-picker-grid">
                        <div className="form-group full-row">
                            <label className="form-label">Select Inventory Item <span className="required-star">*</span></label>
                            <select
                                className={`form-input ${errors.item ? "is-invalid" : ""}`}
                                value={selectedItemId}
                                onChange={handleItemSelection}
                            >
                                <option value="">-- Choose Item from Stock --</option>
                                {docType === "po" && (
                                    <option
                                        value="custom"
                                        style={{
                                            fontWeight: "bold",
                                            color: "#6366f1",
                                            backgroundColor: "rgba(99, 102, 241, 0.08)"
                                        }}
                                    >
                                        ✨ + Add Custom / New Item (Not in stock)
                                    </option>
                                )}
                                {items.map(itm => (
                                    <option key={itm.id} value={itm.id}>
                                        {itm.name} ({itm.warehouse}) [Qty: {itm.quantity} {itm.uom || 'units'}]
                                    </option>
                                ))}
                            </select>
                            {errors.item && <span className="error-text">{errors.item}</span>}
                        </div>

                        {selectedItemId === "custom" && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Custom Item Name <span className="required-star">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-input ${errors.customName ? "is-invalid" : ""}`}
                                        placeholder="e.g. Wooden Table"
                                        value={customNameInput}
                                        onChange={(e) => setCustomNameInput(e.target.value)}
                                    />
                                    {errors.customName && <span className="error-text">{errors.customName}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Custom Item Code <span className="required-star">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-input ${errors.customCode ? "is-invalid" : ""}`}
                                        placeholder="e.g. ITM-839021"
                                        value={customCodeInput}
                                        onChange={(e) => setCustomCodeInput(e.target.value)}
                                        readOnly
                                    />
                                    {errors.customCode && <span className="error-text">{errors.customCode}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Target Warehouse <span className="required-star">*</span></label>
                                    <select
                                        className={`form-input ${errors.customWarehouse ? "is-invalid" : ""}`}
                                        value={customWarehouse}
                                        onChange={(e) => setCustomWarehouse(e.target.value)}
                                    >
                                        <option value="">-- Select Warehouse --</option>
                                        {warehouses.map(wh => (
                                            <option key={wh} value={wh}>{wh}</option>
                                        ))}
                                    </select>
                                    {errors.customWarehouse && <span className="error-text">{errors.customWarehouse}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category Type <span className="required-star">*</span></label>
                                    <select
                                        className={`form-input ${errors.customCategoryType ? "is-invalid" : ""}`}
                                        value={customCategoryType}
                                        onChange={(e) => setCustomCategoryType(e.target.value)}
                                    >
                                        <option value="">-- Select Type --</option>
                                        <option value="Consumable">Consumable</option>
                                        <option value="Non-Consumable">Non-Consumable</option>
                                        <option value="Asset">Asset</option>
                                        <option value="Non-Asset">Non-Asset</option>
                                        <option value="Returnable">Returnable</option>
                                        <option value="Non-Returnable">Non-Returnable</option>
                                        <option value="Capital">Capital Item</option>
                                        <option value="Revenue">Revenue Item</option>
                                    </select>
                                    {errors.customCategoryType && <span className="error-text">{errors.customCategoryType}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category <span className="required-star">*</span></label>
                                    <select
                                        className={`form-input ${errors.customCategory ? "is-invalid" : ""}`}
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value)}
                                    >
                                        <option value="">-- Select Category --</option>
                                        {categories.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    {errors.customCategory && <span className="error-text">{errors.customCategory}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Buying Currency <span className="required-star">*</span></label>
                                    <select
                                        className={`form-input ${errors.customCurrency ? "is-invalid" : ""}`}
                                        value={customCurrency}
                                        onChange={(e) => setCustomCurrency(e.target.value)}
                                    >
                                        <option value="INR">INR — Indian Rupee</option>
                                        <option value="USD">USD — US Dollar</option>
                                        <option value="EUR">EUR — Euro</option>
                                        <option value="GBP">GBP — British Pound</option>
                                        <option value="JPY">JPY — Japanese Yen</option>
                                        <option value="CNY">CNY — Chinese Yuan</option>
                                        <option value="AUD">AUD — Australian Dollar</option>
                                        <option value="CAD">CAD — Canadian Dollar</option>
                                        <option value="CHF">CHF — Swiss Franc</option>
                                        <option value="SEK">SEK — Swedish Krona</option>
                                        <option value="NZD">NZD — New Zealand Dollar</option>
                                    </select>
                                    {errors.customCurrency && <span className="error-text">{errors.customCurrency}</span>}
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label className="form-label">Quantity <span className="required-star">*</span></label>
                            <input
                                type="number"
                                className={`form-input ${errors.qty ? "is-invalid" : ""}`}
                                placeholder="0"
                                value={itemQty}
                                onChange={(e) => setItemQty(e.target.value)}
                            />
                            {errors.qty && <span className="error-text">{errors.qty}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Unit Price (₹) <span className="required-star">*</span></label>
                            <input
                                type="number"
                                className={`form-input ${errors.price ? "is-invalid" : ""} ${docType === "invoice" ? "readonly-input" : ""}`}
                                placeholder="0.00"
                                value={itemPrice}
                                onChange={(e) => setItemPrice(e.target.value)}
                                readOnly={docType === "invoice"}
                            />
                            {errors.price && <span className="error-text">{errors.price}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Unit (UoM) <span className="required-star">*</span></label>
                            <select
                                className={`form-input ${docType === "invoice" ? "readonly-input" : ""}`}
                                value={itemUom}
                                onChange={(e) => setItemUom(e.target.value)}
                                disabled={docType === "invoice"}
                            >
                                {uoms.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tax Slab (GST %) <span className="required-star">*</span></label>
                            <select
                                className={`form-input ${docType === "invoice" ? "readonly-input" : ""}`}
                                value={itemTaxSlab}
                                onChange={(e) => setItemTaxSlab(e.target.value)}
                                disabled={docType === "invoice"}
                            >
                                {taxSlabs.map(slab => (
                                    <option key={slab} value={slab}>{slab}</option>
                                ))}
                            </select>
                        </div>

                        <button type="submit" className="add-item-btn full-row">
                            <i className="bi bi-cart-plus-fill me-1"></i> Add to Document List
                        </button>
                    </form>

                {/* Cart Items Table */}
                {selectedItems.length > 0 && (
                    <>
                        <div className="section-divider"></div>
                        <h5 className="section-card-title">Added Items List</h5>
                        <div className="table-responsive">
                            <table className="doc-item-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: "30%" }}>Item</th>
                                        <th style={{ width: "10%" }} className="text-center">Qty</th>
                                        <th style={{ width: "12%" }} className="text-end">Price</th>
                                        <th style={{ width: "16%" }} className="text-end text-nowrap">Taxable Amt</th>
                                        <th style={{ width: "12%" }} className="text-center">GST</th>
                                        <th style={{ width: "12%" }} className="text-end">Total</th>
                                        <th style={{ width: "8%" }} className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedItems.map((itm) => (
                                        <tr key={itm.id}>
                                            <td>
                                                <div className="item-name">{itm.name}</div>
                                                <small className="item-meta">
                                                    {itm.code} • {itm.warehouse} 
                                                    {itm.isCustom && <span className="badge bg-primary ms-1 text-white" style={{fontSize: '9px'}}>Custom</span>}
                                                </small>
                                            </td>
                                            <td className="text-center text-nowrap">{itm.quantity} {itm.uom}</td>
                                            <td className="text-end">₹{itm.price.toLocaleString()}</td>
                                            <td className="text-end">₹{(itm.taxableAmount || (itm.quantity * itm.price)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                            <td className="text-center">{itm.taxSlab}</td>
                                            <td className="text-end font-bold">₹{itm.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    className="delete-item-btn"
                                                    onClick={() => handleRemoveItem(itm.id)}
                                                    title="Remove Item"
                                                >
                                                    <i className="bi bi-trash3-fill"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Divider */}
                <div className="section-divider"></div>

                {/* Final Settings & Save Panel */}
                <div className="form-group full-row">
                        <label className="form-label">Terms & Conditions</label>
                        <textarea
                            className="form-input form-textarea-mini"
                            value={terms}
                            onChange={(e) => setTerms(e.target.value)}
                        />
                    </div>

                    <div className="sync-inventory-control">
                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                checked={syncInventory}
                                onChange={(e) => setSyncInventory(e.target.checked)}
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-label">
                                <strong>Adjust Inventory Stock & Log Ledger</strong>
                                <span className="checkbox-sub">
                                    {docType === "po" 
                                        ? "Checking this adds the items directly into warehouse stock quantities." 
                                        : "Checking this deducts items from warehouse stock quantities."}
                                </span>
                            </span>
                        </label>
                    </div>

                    <div className="doc-action-buttons">
                        <button
                            type="button"
                            className="doc-btn btn-secondary"
                            onClick={handleReset}
                        >
                            <i className="bi bi-arrow-counterclockwise me-1"></i> Clear Form
                        </button>
                        <button
                            type="button"
                            className="doc-btn btn-print text-nowrap"
                            onClick={handlePrint}
                        >
                            <i className="bi bi-printer-fill me-1"></i> Print / Save PDF
                        </button>
                        <button
                            type="button"
                            className="doc-btn btn-primary text-nowrap"
                            onClick={handleSaveDocument}
                        >
                            <i className="bi bi-check-circle-fill me-1"></i> Save & Record Doc
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Column: Live A4 Printable Preview */}
            <div className="preview-container">
                <div className="print-badge no-print">
                    <i className="bi bi-eye-fill me-1"></i> Live A4 Print Preview
                </div>
                
                <div className="invoice-preview-card">
                    {/* Invoice Letterhead */}
                    <div className="preview-letterhead">
                        <div className="letterhead-company">
                            <div className="company-logo-preview">
                                <i className="bi bi-box-seam-fill"></i>
                            </div>
                            <div>
                                <h2 className="company-title">IMS Pro Logistics Ltd.</h2>
                                <p className="company-details">
                                    Sector 62, Noida Industrial Hub, UP, 201301<br />
                                    Email: contact@imspro.logistics.com | Phone: +91-9988776655<br />
                                    <strong>GSTIN: 09AAAAA1111A1Z1</strong>
                                </p>
                            </div>
                        </div>
                        <div className="letterhead-doc-type">
                            <h1>{docType === "invoice" ? "TAX INVOICE" : "PURCHASE ORDER"}</h1>
                            <div className="doc-stamp">ORIGINAL</div>
                        </div>
                    </div>

                    <div className="preview-divider"></div>

                    {/* Parties Section */}
                    <div className="preview-parties-grid">
                        <div className="party-box">
                            <span className="party-header">{docType === "invoice" ? "BILL TO (CUSTOMER)" : "ORDER TO (SUPPLIER)"}</span>
                            {docType === "po" ? (
                                <div className="party-details">
                                    <strong>{supplierName || "Select Supplier"}</strong>
                                    {(() => {
                                        const selectedSupObj = suppliers.find(s => s.name === supplierName);
                                        return selectedSupObj ? (
                                            <p>
                                                {selectedSupObj.contactPerson && <>Attn: {selectedSupObj.contactPerson}<br /></>}
                                                {selectedSupObj.address && <>{selectedSupObj.address}<br /></>}
                                                {selectedSupObj.city && <>{selectedSupObj.city}<br /></>}
                                                {selectedSupObj.phone && <>Phone: +91 {selectedSupObj.phone}<br /></>}
                                                {selectedSupObj.email && <>Email: {selectedSupObj.email}<br /></>}
                                                {selectedSupObj.gst && <>GSTIN: {selectedSupObj.gst}<br /></>}
                                            </p>
                                        ) : (
                                            <p>Registered supplier contact details and warehouse logs are active.</p>
                                        );
                                    })()}
                                    {shippingAddress && (
                                        <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px', textAlign: 'left' }}>SHIP TO:</span>
                                            <p className="pre-wrap" style={{ margin: 0, textAlign: 'left' }}>{shippingAddress}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="party-details">
                                    <strong>{customerName || "Customer Name"}</strong>
                                    <p className="pre-wrap">{customerAddress || "Customer address details go here..."}</p>
                                    {(customerPhone || customerEmail) && (
                                        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '11.5px', textAlign: 'left' }}>
                                            {customerPhone && <>Phone: {customerPhone}<br /></>}
                                            {customerEmail && <>Email: {customerEmail}</>}
                                        </p>
                                    )}
                                    {customerGst && <p style={{ marginTop: '6px', fontSize: '11px', color: '#475569', textAlign: 'left' }}><strong>GSTIN:</strong> {customerGst}</p>}
                                </div>
                            )}
                        </div>
                        <div className="party-box text-end">
                            <div className="meta-row">
                                <span className="meta-label">{docType === "invoice" ? "Invoice No:" : "PO Number:"}</span>
                                <strong className="meta-value">{docNumber}</strong>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">{docType === "po" ? "PO Date:" : "Invoice Date:"}</span>
                                <span className="meta-value">{formatDate(docDate)}</span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">Due Date:</span>
                                <span className="meta-value">{formatDate(dueDate)}</span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">Payment Terms:</span>
                                <span className="meta-value">{docType === "po" ? (paymentTerms || "Net 30") : "Net 30 Days"}</span>
                            </div>
                            {docType === "po" && quoteRef && (
                                <div className="meta-row">
                                    <span className="meta-label">Quote Ref:</span>
                                    <span className="meta-value">{quoteRef}</span>
                                </div>
                            )}
                            {docType === "invoice" && paymentMode && (
                                <div className="meta-row">
                                    <span className="meta-label">Payment Mode:</span>
                                    <span className="meta-value">{paymentMode}</span>
                                </div>
                            )}
                            {docType === "invoice" && refPoNumber && (
                                <div className="meta-row">
                                    <span className="meta-label">PO Ref:</span>
                                    <span className="meta-value">{refPoNumber}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="preview-table-container">
                        <table className="preview-item-table">
                            <thead>
                                <tr>
                                    <th style={{ width: "5%" }}>S.No</th>
                                    <th>Description / Item Details</th>
                                    <th style={{ width: "10%" }} className="text-end">Qty</th>
                                    <th style={{ width: "7%" }}>Unit</th>
                                    <th style={{ width: "11%" }} className="text-end">Price (₹)</th>
                                    <th style={{ width: "13%" }} className="text-end">Taxable Val (₹)</th>
                                    <th style={{ width: "10%" }}>GST Slab</th>
                                    <th style={{ width: "11%" }} className="text-end">GST Tax (₹)</th>
                                    <th style={{ width: "13%" }} className="text-end">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedItems.length > 0 ? (
                                    selectedItems.map((itm, index) => (
                                        <tr key={itm.id}>
                                            <td className="text-center">{index + 1}</td>
                                            <td>
                                                <div className="preview-item-name">{itm.name}</div>
                                                <small className="preview-item-desc">Code: {itm.code} • WH: {itm.warehouse}</small>
                                            </td>
                                            <td className="text-end">{itm.quantity.toLocaleString()}</td>
                                            <td>{itm.uom}</td>
                                            <td className="text-end">{itm.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="text-end">{(itm.taxableAmount || (itm.quantity * itm.price)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td>{itm.taxSlab}</td>
                                            <td className="text-end">{itm.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="text-end">{itm.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="empty-table-placeholder">
                                            No items added. Use the form on the left to add items to this document preview.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Calculations */}
                    <div className="preview-summary-container">
                        <div className="terms-col">
                            <span className="summary-section-title">Terms & Conditions</span>
                            <p className="pre-wrap terms-text">{terms}</p>
                        </div>
                        <div className="calc-col">
                            <div className="calc-row">
                                <span>Subtotal (Taxable Amt):</span>
                                <strong>₹{totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                            </div>
                            <div className="calc-row">
                                <span>CGST Amount:</span>
                                <span>₹{cgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="calc-row">
                                <span>SGST Amount:</span>
                                <span>₹{sgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="calc-row divider"></div>
                            <div className="calc-row grand-total">
                                <span>Grand Total:</span>
                                <span>₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Signature block */}
                    <div className="preview-signature-block">
                        <div className="signature-col">
                            <p>Receiver's Signature</p>
                            <div className="signature-line"></div>
                        </div>
                        <div className="signature-col text-end">
                            <p>For IMS Pro Logistics Ltd.</p>
                            <br /><br />
                            <p><strong>Authorised Signatory</strong></p>
                        </div>
                    </div>
                </div>
            </div>
                </div>
            )}

            {activeTab === "history" && (
                <div className="doc-history-container animate-fade-in no-print">
                    <div className="history-header">
                        <h4 className="section-card-title">
                            <i className="bi bi-clock-history me-2 text-primary"></i>
                            Saved Invoices & POs History
                        </h4>
                        {savedDocs.length > 0 && (
                            <button
                                type="button"
                                className="doc-btn btn-secondary text-danger"
                                onClick={handleClearAllHistory}
                                style={{ flex: 'none', padding: '6px 12px', fontSize: '12.5px', height: 'fit-content' }}
                            >
                                <i className="bi bi-trash3-fill me-1"></i> Clear All History
                            </button>
                        )}
                    </div>

                    <div className="history-search-row">
                        <div className="search-input-box">
                            <i className="bi bi-search search-icon"></i>
                            <input
                                type="text"
                                className="form-input search-field"
                                placeholder="Search by doc number, client, or supplier..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="filter-buttons">
                            <button
                                type="button"
                                className={`filter-btn ${filterType === "all" ? "active" : ""}`}
                                onClick={() => setFilterType("all")}
                            >
                                All Docs
                            </button>
                            <button
                                type="button"
                                className={`filter-btn ${filterType === "invoice" ? "active" : ""}`}
                                onClick={() => setFilterType("invoice")}
                            >
                                Invoices
                            </button>
                            <button
                                type="button"
                                className={`filter-btn ${filterType === "po" ? "active" : ""}`}
                                onClick={() => setFilterType("po")}
                            >
                                Purchase Orders
                            </button>
                        </div>
                    </div>

                        {filteredDocs.length === 0 ? (
                            <div className="empty-history text-center py-5">
                                <i className="bi bi-folder-x text-muted" style={{ fontSize: '48px' }}></i>
                                <h5 className="mt-3 text-secondary">No records found</h5>
                                <p className="text-muted">Create and save document records under the "Create Document" tab.</p>
                            </div>
                        ) : (
                            <div className="history-grid">
                                {filteredDocs.map((doc) => (
                                    <div 
                                        key={doc.id} 
                                        className="history-card clickable-card"
                                        title="Click to view detailed document"
                                        onClick={(e) => {
                                            if (!e.target.closest('.history-card-actions')) {
                                                setViewingDoc(doc);
                                            }
                                        }}
                                    >
                                        <div className="history-card-top">
                                            <span className={`text-nowrap doc-type-pill ${doc.docType}`}>
                                                {doc.docType === "po" ? (
                                                    <><i className="bi bi-cart-check-fill me-1"></i> PO</>
                                                ) : (
                                                    <><i className="bi bi-receipt me-1"></i> INV</>
                                                )}
                                            </span>
                                            <span className={`text-nowrap doc-status-pill ${(doc.status || "Done").toLowerCase()}`}>
                                                {doc.status || "Done"}
                                            </span>
                                        </div>
                                        <div className="history-card-body">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <h4 className="text-nowrap doc-num-title" style={{ margin: 0 }}>{doc.docNumber}</h4>
                                                <span className="text-nowrap doc-date-text" title="Document Date">
                                                    {formatDate(doc.docDate)}
                                                </span>
                                            </div>
                                            <hr className="card-divider" />
                                            <div className="history-meta-info">
                                                <div className="info-row">
                                                    <span className="info-lbl">Party:</span>
                                                    <span className="info-val"><strong>{doc.partyName}</strong></span>
                                                </div>
                                                <div className="info-row">
                                                     <span className="info-lbl">Due Date:</span>
                                                     <span className="info-val">{formatDate(doc.dueDate)}</span>
                                                 </div>
                                                <div className="info-row">
                                                    <span className="info-lbl">Items count:</span>
                                                    <span className="info-val">{doc.items?.length || 0} line items</span>
                                                </div>
                                                <div className="info-row total-row">
                                                    <span className="info-lbl">Grand Total:</span>
                                                    <span className="info-val total-amt-text">₹{doc.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>

                                            {/* Compact Items List for History Card */}
                                            <div className="history-card-items-section">
                                                <div className="history-items-header">
                                                    <span>Item Details</span>
                                                    <span>Qty × Price = Total</span>
                                                </div>
                                                <div className="history-items-list">
                                                    {doc.items && doc.items.length > 0 ? (
                                                        doc.items.map((item, idx) => (
                                                            <div key={idx} className="history-item-row">
                                                                <div className="h-item-info">
                                                                    <span className="h-item-name" title={item.name}>{item.name}</span>
                                                                    <small className="h-item-code">{item.code}</small>
                                                                </div>
                                                                <div className="h-item-pricing">
                                                                    <span className="h-item-qty">{item.quantity} {item.uom} × ₹{item.price.toLocaleString("en-IN")}</span>
                                                                    <strong className="h-item-total-val">₹{(item.quantity * item.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="history-item-empty">No items added</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="history-card-actions">
                                            {(doc.status || "Done") === "Pending" && (
                                                <button
                                                    type="button"
                                                    className="history-action-btn done text-nowrap"
                                                    onClick={(e) => handleMarkDocDone(doc, e)}
                                                    title="Mark as Done & Sync Inventory"
                                                >
                                                    <i className="bi bi-check-circle-fill me-1"></i> Done
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="history-action-btn view text-nowrap"
                                                onClick={() => setPreviewDoc(doc)}
                                                title="View & Re-print"
                                            >
                                                <i className="bi bi-printer-fill me-1"></i> Re-print
                                            </button>
                                            {doc.docType === "po" && (doc.status || "Done") === "Pending" && (
                                                <button
                                                    type="button"
                                                    className="history-action-btn email text-nowrap"
                                                    onClick={(e) => handleOpenEmailModal(doc, e)}
                                                    title="Email PO to Supplier"
                                                >
                                                    <i className="bi bi-envelope-fill me-1"></i> Email PO
                                                </button>
                                            )}
                                            {(doc.status || "Done") === "Pending" && (
                                                <button
                                                    type="button"
                                                    className="history-action-btn edit text-nowrap"
                                                    onClick={(e) => handleLoadDocToEditor(doc, e)}
                                                    title="Load into Editor"
                                                >
                                                    <i className="bi bi-pencil-square me-1"></i> Edit / Load
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="history-action-btn delete"
                                                onClick={(e) => handleDeleteDoc(doc.id, e)}
                                                title="Delete from history"
                                            >
                                                <i className="bi bi-trash3-fill"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
            )}

            {activeTab === "email_logs" && (
                <div className="doc-email-logs-container animate-fade-in no-print">
                    <div className="history-header">
                        <h4 className="section-card-title">
                            <i className="bi bi-envelope-paper-fill me-2 text-primary"></i>
                            Purchase Order Email Dispatch Logs
                        </h4>
                        {emailLogs.length > 0 && (
                            <button
                                type="button"
                                className="doc-btn btn-secondary text-danger"
                                onClick={async () => {
                                    const confirmed = await showCustomConfirm("Are you sure you want to delete all sent email logs? This cannot be undone.");
                                    if (confirmed) {
                                        mailService.clearEmailLogs();
                                        setEmailLogs([]);
                                        if (showToast) {
                                            showToast("Email logs cleared successfully.");
                                        } else {
                                            await showCustomAlert("Email logs cleared successfully.");
                                        }
                                    }
                                }}
                                style={{ flex: 'none', padding: '6px 12px', fontSize: '12.5px', height: 'fit-content' }}
                            >
                                <i className="bi bi-trash3-fill me-1"></i> Clear Email Logs
                            </button>
                        )}
                    </div>

                    {emailLogs.length === 0 ? (
                        <div className="empty-history text-center py-5">
                            <i className="bi bi-envelope-x text-muted" style={{ fontSize: '48px' }}></i>
                            <h5 className="mt-3 text-secondary">No sent email logs found</h5>
                            <p className="text-muted">Simulate emailing a Purchase Order from the Saved Documents History tab.</p>
                        </div>
                    ) : (
                        <div className="email-logs-table-container">
                            <table className="email-logs-table">
                                <thead>
                                    <tr>
                                        <th>Date & Time</th>
                                        <th>PO Ref</th>
                                        <th>Supplier Email (To)</th>
                                        <th>Subject</th>
                                        <th>Attachment</th>
                                        <th>Sender</th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {emailLogs.map((log) => (
                                        <tr key={log.id} className="email-log-row">
                                            <td>{new Date(log.timestamp).toLocaleString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}</td>
                                            <td><strong>{log.docNumber}</strong></td>
                                            <td><code>{log.to}</code></td>
                                            <td>{log.subject}</td>
                                            <td>
                                                <span className="email-attachment-pill">
                                                    <i className="bi bi-file-pdf-fill text-danger me-1"></i>
                                                    {log.attachmentName}
                                                </span>
                                            </td>
                                            <td>{log.sender}</td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    className="history-action-btn view text-nowrap"
                                                    onClick={() => setSelectedLogEmail(log)}
                                                    title="View Sent Email Content"
                                                    style={{ padding: '4px 10px', fontSize: '12px' }}
                                                >
                                                    <i className="bi bi-eye-fill me-1"></i> View Content
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Detailed Interactive View Modal */}
            {viewingDoc && (
                <div className="doc-modal-overlay" onClick={() => setViewingDoc(null)}>
                    <div className="doc-modal-card animate-flip-in detailed-view-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="detailed-modal-header">
                            <div className="header-info">
                                <span className={`doc-type-badge ${viewingDoc.docType}`}>
                                    {viewingDoc.docType === "po" ? (
                                        <><i className="bi bi-cart-check-fill me-1"></i> Purchase Order</>
                                    ) : (
                                        <><i className="bi bi-receipt me-1"></i> Sales Invoice</>
                                    )}
                                </span>
                                <h3>{viewingDoc.docNumber}</h3>
                                <span className={`status-badge ${(viewingDoc.status || "Done").toLowerCase()}`}>
                                    {viewingDoc.status || "Done"}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="close-x-btn"
                                onClick={() => setViewingDoc(null)}
                                title="Close detailed view"
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        
                        <div className="detailed-modal-body">
                            {/* Stepper Progress */}
                            <div className="doc-stepper">
                                <div className="step completed">
                                    <div className="step-num"><i className="bi bi-check-lg"></i></div>
                                    <span className="step-label">Drafted</span>
                                </div>
                                <div className="step-line completed"></div>
                                <div className="step completed">
                                    <div className="step-num"><i className="bi bi-check-lg"></i></div>
                                    <span className="step-label">Saved</span>
                                </div>
                                <div className="step-line completed"></div>
                                <div className={`step ${viewingDoc.status === "Done" ? "completed" : "pending"}`}>
                                    <div className="step-num">
                                        {viewingDoc.status === "Done" ? <i className="bi bi-check-lg"></i> : <i className="bi bi-hourglass-split"></i>}
                                    </div>
                                    <span className="step-label">Stock Synced</span>
                                </div>
                            </div>

                            {/* Two-Column Metadata */}
                            <div className="metadata-grid">
                                <div className="meta-card">
                                    <div className="meta-card-header">
                                        <i className="bi bi-person-fill text-primary"></i>
                                        <h4>{viewingDoc.docType === "po" ? "Supplier Details" : "Customer Details"}</h4>
                                    </div>
                                    <div className="meta-card-content">
                                        <div className="meta-data-item">
                                            <span className="meta-item-label">Name</span>
                                            <span className="meta-item-val"><strong>{viewingDoc.partyName}</strong></span>
                                        </div>
                                        {viewingDoc.docType === "invoice" ? (
                                            <>
                                                {viewingDoc.customerPhone && (
                                                    <div className="meta-data-item">
                                                        <span className="meta-item-label">Phone</span>
                                                        <span className="meta-item-val">{viewingDoc.customerPhone}</span>
                                                    </div>
                                                )}
                                                {viewingDoc.customerEmail && (
                                                    <div className="meta-data-item">
                                                        <span className="meta-item-label">Email</span>
                                                        <span className="meta-item-val">{viewingDoc.customerEmail}</span>
                                                    </div>
                                                )}
                                                {viewingDoc.customerGst && (
                                                    <div className="meta-data-item">
                                                        <span className="meta-item-label">GSTIN</span>
                                                        <span className="meta-item-val text-uppercase">{viewingDoc.customerGst}</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (() => {
                                            const supplierObj = suppliers.find(s => s.name.trim().toLowerCase() === viewingDoc.partyName.trim().toLowerCase()) || {};
                                            const contactPerson = viewingDoc.supplierContactPerson || supplierObj.contactPerson;
                                            const phone = viewingDoc.supplierPhone || supplierObj.phone;
                                            const email = viewingDoc.supplierEmail || supplierObj.email;
                                            const gst = viewingDoc.supplierGst || supplierObj.gst;
                                            const city = viewingDoc.supplierCity || supplierObj.city;
                                            const address = viewingDoc.partyAddress || supplierObj.address;
                                            return (
                                                <>
                                                    {contactPerson && (
                                                        <div className="meta-data-item">
                                                            <span className="meta-item-label">Contact Person</span>
                                                            <span className="meta-item-val">{contactPerson}</span>
                                                        </div>
                                                    )}
                                                    {phone && (
                                                        <div className="meta-data-item">
                                                            <span className="meta-item-label">Phone</span>
                                                            <span className="meta-item-val">{phone}</span>
                                                        </div>
                                                    )}
                                                    {email && (
                                                        <div className="meta-data-item">
                                                            <span className="meta-item-label">Email</span>
                                                            <span className="meta-item-val">{email}</span>
                                                        </div>
                                                    )}
                                                    {gst && (
                                                        <div className="meta-data-item">
                                                            <span className="meta-item-label">GSTIN</span>
                                                            <span className="meta-item-val text-uppercase">{gst}</span>
                                                        </div>
                                                    )}
                                                    {city && (
                                                        <div className="meta-data-item">
                                                            <span className="meta-item-label">City</span>
                                                            <span className="meta-item-val">{city}</span>
                                                        </div>
                                                    )}
                                                    {address && (
                                                        <div className="meta-data-item">
                                                            <span className="meta-item-label">Address</span>
                                                            <span className="meta-item-val pre-wrap">{address}</span>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                        {viewingDoc.docType === "invoice" && viewingDoc.partyAddress && (
                                            <div className="meta-data-item">
                                                <span className="meta-item-label">Address</span>
                                                <span className="meta-item-val pre-wrap">{viewingDoc.partyAddress}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="meta-card">
                                    <div className="meta-card-header">
                                        <i className="bi bi-file-earmark-text-fill text-primary"></i>
                                        <h4>Document Info</h4>
                                    </div>
                                    <div className="meta-card-content">
                                        <div className="meta-data-item">
                                             <span className="meta-item-label">{viewingDoc.docType === "po" ? "PO Date" : "Invoice Date"}</span>
                                             <span className="meta-item-val">{formatDate(viewingDoc.docDate)}</span>
                                         </div>
                                         <div className="meta-data-item">
                                             <span className="meta-item-label">Due Date</span>
                                             <span className="meta-item-val">{formatDate(viewingDoc.dueDate)}</span>
                                         </div>
                                        {viewingDoc.docType === "invoice" ? (
                                            <div className="meta-data-item">
                                                <span className="meta-item-label">Payment Mode</span>
                                                <span className="meta-item-val">{viewingDoc.paymentMode || "UPI"}</span>
                                            </div>
                                        ) : (
                                            <>
                                                {viewingDoc.paymentTerms && (
                                                    <div className="meta-data-item">
                                                        <span className="meta-item-label">Payment Terms</span>
                                                        <span className="meta-item-val">{viewingDoc.paymentTerms}</span>
                                                    </div>
                                                )}
                                                {viewingDoc.quoteRef && (
                                                    <div className="meta-data-item">
                                                        <span className="meta-item-label">Quote Ref</span>
                                                        <span className="meta-item-val">{viewingDoc.quoteRef}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {viewingDoc.shippingAddress && (
                                            <div className="meta-data-item">
                                                <span className="meta-item-label">Shipping Addr</span>
                                                <span className="meta-item-val pre-wrap">{viewingDoc.shippingAddress}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Table of items */}
                            <div className="items-table-section">
                                <h4>Line Items ({viewingDoc.items?.length || 0})</h4>
                                <div className="table-container">
                                    <table className="detailed-items-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Item Name</th>
                                                <th>Code</th>
                                                <th>Warehouse</th>
                                                <th>Qty</th>
                                                <th>Price</th>
                                                <th>Taxable Value</th>
                                                <th>Tax Slab</th>
                                                <th className="text-end">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewingDoc.items && viewingDoc.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{idx + 1}</td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <strong>{item.name}</strong>
                                                            {item.isCustom && <span className="custom-item-badge">New/Custom</span>}
                                                        </div>
                                                    </td>
                                                    <td className="text-nowrap"><code>{item.code}</code></td>
                                                    <td>{item.warehouse || "Main Warehouse"}</td>
                                                    <td>{item.quantity} <small className="text-muted">{item.uom}</small></td>
                                                    <td>₹{item.price.toLocaleString("en-IN")}</td>
                                                    <td>₹{(item.taxableAmount || (item.quantity * item.price)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                                    <td>{item.taxSlab}</td>
                                                    <td className="text-end font-bold">₹{item.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Summary Totals Cards */}
                            <div className="summary-totals-bar">
                                <div className="total-box-small">
                                    <span>Taxable Amt:</span>
                                    <strong>₹{viewingDoc.totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                                </div>
                                <div className="total-box-small">
                                    <span>Total Tax:</span>
                                    <strong>₹{viewingDoc.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                                </div>
                                <div className="total-box-large">
                                    <span>Grand Total:</span>
                                    <strong>₹{viewingDoc.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                                </div>
                            </div>

                            {/* Terms section */}
                            {viewingDoc.terms && (
                                <div className="terms-section">
                                    <h5>Notes & Terms:</h5>
                                    <p className="pre-wrap">{viewingDoc.terms}</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Action Footer */}
                        <div className="detailed-modal-footer">
                            <div className="left-actions">
                                {viewingDoc.status === "Pending" && (
                                    <>
                                        <button
                                            type="button"
                                            className="action-btn done"
                                            onClick={(e) => {
                                                setViewingDoc(null);
                                                handleMarkDocDone(viewingDoc, e);
                                            }}
                                        >
                                            <i className="bi bi-check-circle-fill"></i> Mark Done & Sync
                                        </button>
                                        <button
                                            type="button"
                                            className="action-btn edit"
                                            onClick={(e) => {
                                                setViewingDoc(null);
                                                handleLoadDocToEditor(viewingDoc, e);
                                            }}
                                        >
                                            <i className="bi bi-pencil-square"></i> Edit
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    className="action-btn print"
                                    onClick={() => {
                                        setViewingDoc(null);
                                        setPreviewDoc(viewingDoc);
                                    }}
                                >
                                    <i className="bi bi-printer-fill"></i> Open Print View
                                </button>
                                {viewingDoc.docType === "po" && (viewingDoc.status || "Done") === "Pending" && (
                                    <button
                                        type="button"
                                        className="action-btn email"
                                        onClick={(e) => {
                                            setViewingDoc(null);
                                            handleOpenEmailModal(viewingDoc, e);
                                        }}
                                    >
                                        <i className="bi bi-envelope-fill"></i> Email Supplier
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                className="action-btn close"
                                onClick={() => setViewingDoc(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Live Printable Preview Modal */}
            {previewDoc && (
                <div className="doc-modal-overlay" onClick={() => setPreviewDoc(null)}>
                    <div className="doc-modal-card animate-flip-in" onClick={(e) => e.stopPropagation()}>
                        <div className="doc-modal-header no-print">
                            <span className="modal-title">
                                <i className="bi bi-file-earmark-text-fill text-primary me-2"></i>
                                Document Preview - {previewDoc.docNumber}
                            </span>
                            <div className="doc-modal-actions-group">
                                <button
                                    type="button"
                                    className="doc-btn btn-print text-nowrap"
                                    onClick={() => {
                                        document.body.classList.add("printing-modal");
                                        window.print();
                                        document.body.classList.remove("printing-modal");
                                    }}
                                >
                                    <i className="bi bi-printer-fill me-1"></i> Print / Save PDF
                                </button>
                                <button
                                    type="button"
                                    className="doc-btn btn-secondary"
                                    onClick={() => setPreviewDoc(null)}
                                >
                                    <i className="bi bi-x-lg"></i> Close
                                </button>
                            </div>
                        </div>
                        <div className="doc-modal-body">
                            {/* Render Preview Card inside Modal */}
                            <div className="invoice-preview-card printable-card">
                                {/* Invoice Letterhead */}
                                <div className="preview-letterhead">
                                    <div className="letterhead-company">
                                        <div className="company-logo-preview">
                                            <i className="bi bi-box-seam-fill"></i>
                                        </div>
                                        <div>
                                            <h2 className="company-title">IMS Pro Logistics Ltd.</h2>
                                            <p className="company-details">
                                                Sector 62, Noida Industrial Hub, UP, 201301<br />
                                                Email: contact@imspro.logistics.com | Phone: +91-9988776655<br />
                                                <strong>GSTIN: 09AAAAA1111A1Z1</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="letterhead-doc-type">
                                        <h1>{previewDoc.docType === "invoice" ? "TAX INVOICE" : "PURCHASE ORDER"}</h1>
                                        <div className="doc-stamp">ORIGINAL</div>
                                    </div>
                                </div>

                                <div className="preview-divider"></div>

                                {/* Parties Section */}
                                <div className="preview-parties-grid">
                                    <div className="party-box">
                                        <span className="party-header">{previewDoc.docType === "invoice" ? "BILL TO (CUSTOMER)" : "ORDER TO (SUPPLIER)"}</span>
                                        {previewDoc.docType === "po" ? (
                                            <div className="party-details">
                                                <strong>{previewDoc.partyName}</strong>
                                                <p>{previewDoc.partyAddress || "Registered supplier contact details and warehouse logs are active."}</p>
                                                {previewDoc.shippingAddress && (
                                                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                                                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px', textAlign: 'left' }}>SHIP TO:</span>
                                                        <p className="pre-wrap" style={{ margin: 0, textAlign: 'left' }}>{previewDoc.shippingAddress}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="party-details">
                                                <strong>{previewDoc.partyName}</strong>
                                                <p className="pre-wrap">{previewDoc.partyAddress}</p>
                                                {(previewDoc.customerPhone || previewDoc.customerEmail) && (
                                                    <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '11.5px', textAlign: 'left' }}>
                                                        {previewDoc.customerPhone && <>Phone: {previewDoc.customerPhone}<br /></>}
                                                        {previewDoc.customerEmail && <>Email: {previewDoc.customerEmail}</>}
                                                    </p>
                                                )}
                                                {previewDoc.customerGst && <p style={{ marginTop: '4px', fontSize: '11px', color: '#475569', textAlign: 'left' }}><strong>GSTIN:</strong> {previewDoc.customerGst}</p>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="party-box text-end">
                                        <div className="meta-row">
                                            <span className="meta-label">{previewDoc.docType === "invoice" ? "Invoice No:" : "PO Number:"}</span>
                                            <strong className="meta-value">{previewDoc.docNumber}</strong>
                                        </div>
                                        <div className="meta-row">
                                             <span className="meta-label">{previewDoc.docType === "po" ? "PO Date:" : "Invoice Date:"}</span>
                                            <span className="meta-value">{formatDate(previewDoc.docDate)}</span>
                                        </div>
                                        <div className="meta-row">
                                            <span className="meta-label">Due Date:</span>
                                            <span className="meta-value">{formatDate(previewDoc.dueDate)}</span>
                                        </div>
                                        <div className="meta-row">
                                            <span className="meta-label">Payment Terms:</span>
                                            <span className="meta-value">{previewDoc.docType === "po" ? (previewDoc.paymentTerms || "Net 30") : "Net 30 Days"}</span>
                                        </div>
                                        {previewDoc.docType === "po" && previewDoc.quoteRef && (
                                            <div className="meta-row">
                                                <span className="meta-label">Quote Ref:</span>
                                                <span className="meta-value">{previewDoc.quoteRef}</span>
                                            </div>
                                        )}
                                        {previewDoc.docType === "invoice" && previewDoc.paymentMode && (
                                            <div className="meta-row">
                                                <span className="meta-label">Payment Mode:</span>
                                                <span className="meta-value">{previewDoc.paymentMode}</span>
                                            </div>
                                        )}
                                        {previewDoc.docType === "invoice" && previewDoc.refPoNumber && (
                                            <div className="meta-row">
                                                <span className="meta-label">PO Ref:</span>
                                                <span className="meta-value">{previewDoc.refPoNumber}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Table Section */}
                                <div className="preview-table-container">
                                    <table className="preview-item-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: "5%" }}>S.No</th>
                                                <th>Description / Item Details</th>
                                                <th style={{ width: "10%" }} className="text-end">Qty</th>
                                                <th style={{ width: "7%" }}>Unit</th>
                                                <th style={{ width: "11%" }} className="text-end">Price (₹)</th>
                                                <th style={{ width: "13%" }} className="text-end">Taxable Val (₹)</th>
                                                <th style={{ width: "10%" }}>GST Slab</th>
                                                <th style={{ width: "11%" }} className="text-end">GST Tax (₹)</th>
                                                <th style={{ width: "13%" }} className="text-end">Amount (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewDoc.items && previewDoc.items.length > 0 ? (
                                                previewDoc.items.map((itm, index) => (
                                                    <tr key={itm.id}>
                                                        <td className="text-center">{index + 1}</td>
                                                        <td>
                                                            <div className="preview-item-name">{itm.name}</div>
                                                            <small className="preview-item-desc">Code: {itm.code} • WH: {itm.warehouse}</small>
                                                        </td>
                                                        <td className="text-end">{itm.quantity.toLocaleString()}</td>
                                                        <td>{itm.uom}</td>
                                                        <td className="text-end">{itm.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        <td className="text-end">{(itm.taxableAmount || (itm.quantity * itm.price)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        <td>{itm.taxSlab}</td>
                                                        <td className="text-end">{itm.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                        <td className="text-end">{itm.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="9" className="empty-table-placeholder">No items</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer Calculations */}
                                <div className="preview-summary-container">
                                    <div className="terms-col">
                                        <span className="summary-section-title">Terms & Conditions</span>
                                        <p className="pre-wrap terms-text">{previewDoc.terms}</p>
                                    </div>
                                    <div className="calc-col">
                                        <div className="calc-row">
                                            <span>Subtotal (Taxable Amt):</span>
                                            <strong>₹{previewDoc.totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                        </div>
                                        <div className="calc-row">
                                            <span>CGST Amount:</span>
                                            <span>₹{Math.round((previewDoc.totalTax / 2) * 100) / 100}</span>
                                        </div>
                                        <div className="calc-row">
                                            <span>SGST Amount:</span>
                                            <span>₹{Math.round((previewDoc.totalTax / 2) * 100) / 100}</span>
                                        </div>
                                        <div className="calc-row divider"></div>
                                        <div className="calc-row grand-total">
                                            <span>Grand Total:</span>
                                            <span>₹{previewDoc.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Signature block */}
                                <div className="preview-signature-block">
                                    <div className="signature-col">
                                        <p>Receiver's Signature</p>
                                        <div className="signature-line"></div>
                                    </div>
                                    <div className="signature-col text-end">
                                        <p>For IMS Pro Logistics Ltd.</p>
                                        <br /><br />
                                        <p><strong>Authorised Signatory</strong></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Alert/Confirm Dialog Popup */}
            {alertConfig && (
                <div className="custom-alert-overlay no-print">
                    <div className="custom-alert-card animate-scale-up">
                        <div className="custom-alert-icon">
                            {alertConfig.type === "confirm" ? (
                                <i className="bi bi-exclamation-triangle-fill text-warning"></i>
                            ) : (
                                <i className="bi bi-info-circle-fill text-primary"></i>
                            )}
                        </div>
                        <div className="custom-alert-body">
                            <p className="custom-alert-message">{alertConfig.message}</p>
                        </div>
                        <div className="custom-alert-actions">
                            {alertConfig.type === "confirm" ? (
                                <>
                                    <button 
                                        type="button" 
                                        className="alert-btn btn-cancel" 
                                        onClick={alertConfig.onCancel}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="button" 
                                        className="alert-btn btn-confirm" 
                                        onClick={alertConfig.onConfirm}
                                    >
                                        Confirm
                                    </button>
                                </>
                            ) : (
                                <button 
                                    type="button" 
                                    className="alert-btn btn-ok" 
                                    onClick={alertConfig.onConfirm}
                                >
                                    OK
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Send Purchase Order Email Modal */}
            {emailingDoc && (
                <div className="doc-modal-overlay" onClick={() => setEmailingDoc(null)}>
                    <div className="doc-modal-card animate-scale-up email-send-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="detailed-modal-header">
                            <div className="header-info">
                                <span className="doc-type-badge po">
                                    <i className="bi bi-cart-check-fill me-1"></i> Purchase Order
                                </span>
                                <h3>Email PO to Supplier</h3>
                            </div>
                            <button
                                type="button"
                                className="close-x-btn"
                                onClick={() => setEmailingDoc(null)}
                                disabled={isSendingEmail}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSendEmail} className="detailed-modal-body">
                            {isSendingEmail ? (
                                <div className="email-sending-loader text-center py-5">
                                    <div className="spinner-border text-primary animate-spin" role="status" style={{ width: '3rem', height: '3rem' }}>
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <h4 className="mt-4 text-primary animate-pulse">Sending PO with Attachment...</h4>
                                    <p className="text-muted">Simulating secure SMTP mail dispatch to supplier network</p>
                                </div>
                            ) : (
                                <>
                                    <div className="email-form-grid">
                                        <div className="form-group">
                                            <label className="form-label">To (Supplier Email) <span className="required-star">*</span></label>
                                            <div className="input-group-with-icon">
                                                <i className="bi bi-envelope input-icon"></i>
                                                <input
                                                    type="email"
                                                    className="form-input text-lowercase"
                                                    placeholder="supplier@example.com"
                                                    value={emailTo}
                                                    onChange={(e) => setEmailTo(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Subject <span className="required-star">*</span></label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Email Subject"
                                                value={emailSubject}
                                                onChange={(e) => setEmailSubject(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Attached Document</label>
                                            <div className="attachment-badge-card">
                                                <div className="attachment-icon">
                                                    <i className="bi bi-file-earmark-pdf-fill text-danger"></i>
                                                </div>
                                                <div className="attachment-details">
                                                    <strong className="attachment-name">{emailingDoc.docNumber}.pdf</strong>
                                                    <span className="attachment-size">PDF Attachment • 45.2 KB • Ready (Document parameters synced)</span>
                                                </div>
                                                <span className="attachment-status-badge">Ready</span>
                                            </div>
                                        </div>

                                        {/* Template Selector */}
                                        <div className="form-group">
                                            <label className="form-label">Email Message Template</label>
                                            <div className="template-picker-row">
                                                <button
                                                    type="button"
                                                    className={`template-btn ${emailTemplate === "formal" ? "active" : ""}`}
                                                    onClick={() => handleTemplateChange("formal")}
                                                >
                                                    Formal Order
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`template-btn ${emailTemplate === "reminder" ? "active" : ""}`}
                                                    onClick={() => handleTemplateChange("reminder")}
                                                >
                                                    Quick Reminder
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`template-btn ${emailTemplate === "urgent" ? "active" : ""}`}
                                                    onClick={() => handleTemplateChange("urgent")}
                                                >
                                                    Urgent Expedition
                                                </button>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Email Content Body <span className="required-star">*</span></label>
                                            <textarea
                                                className="form-input form-textarea-large"
                                                placeholder="Write your custom email content here..."
                                                value={emailBody}
                                                onChange={(e) => setEmailBody(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="detailed-modal-footer mt-4">
                                        <button
                                            type="button"
                                            className="action-btn close"
                                            onClick={() => setEmailingDoc(null)}
                                            disabled={isSendingEmail}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="action-btn email-send-btn"
                                            disabled={isSendingEmail}
                                        >
                                            <i className="bi bi-send-fill me-1"></i> Send PO Email
                                        </button>
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* View Sent Email Log Detailed Modal */}
            {selectedLogEmail && (
                <div className="doc-modal-overlay" onClick={() => setSelectedLogEmail(null)}>
                    <div className="doc-modal-card animate-scale-up email-view-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="detailed-modal-header">
                            <div className="header-info">
                                <span className="doc-type-badge status-delivered">
                                    <i className="bi bi-check2-all me-1"></i> Sent Log
                                </span>
                                <h3>Email Details</h3>
                            </div>
                            <button
                                type="button"
                                className="close-x-btn"
                                onClick={() => setSelectedLogEmail(null)}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="detailed-modal-body">
                            <div className="email-log-meta-box">
                                <div className="meta-item">
                                    <strong>From:</strong> <span>IMS Pro System (noreply@imspro.logistics.com)</span>
                                </div>
                                <div className="meta-item">
                                    <strong>To:</strong> <span><code>{selectedLogEmail.to}</code></span>
                                </div>
                                <div className="meta-item">
                                    <strong>Sent:</strong> <span>{new Date(selectedLogEmail.timestamp).toLocaleString("en-IN", {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    })}</span>
                                </div>
                                <div className="meta-item">
                                    <strong>Subject:</strong> <span>{selectedLogEmail.subject}</span>
                                </div>
                                <div className="meta-item">
                                    <strong>Sender User:</strong> <span>{selectedLogEmail.sender}</span>
                                </div>
                                <div className="meta-item attachment-row">
                                    <strong>Attachment:</strong>
                                    <span className="email-attachment-pill interactive" onClick={async () => {
                                        const docFound = savedDocs.find(d => d.docNumber === selectedLogEmail.docNumber);
                                        if (docFound) {
                                            setSelectedLogEmail(null);
                                            setPreviewDoc(docFound);
                                        } else {
                                            await showCustomAlert("Attached PO document details not found in saved history (might have been deleted).");
                                        }
                                    }} title="Click to view attached PO document">
                                        <i className="bi bi-file-pdf-fill text-danger me-1"></i>
                                        {selectedLogEmail.attachmentName} (45.2 KB)
                                    </span>
                                </div>
                            </div>
                            
                            <div className="email-log-content-body">
                                <h5>Message Body:</h5>
                                <div className="email-body-text">{selectedLogEmail.body}</div>
                            </div>
                        </div>
                        <div className="detailed-modal-footer">
                            <button
                                type="button"
                                className="action-btn close"
                                onClick={() => setSelectedLogEmail(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocGenerator;
