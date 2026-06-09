import React, { useState, useEffect } from "react";
import { transactionService } from "../../services/transactionService";
import { activityService } from "../../services/activityService";
import "./DocGenerator.css";

// Read master lists from Settings
const STORAGE_KEY_SUP = "suppliers";
const STORAGE_KEY_UOM = "customUoms";
const STORAGE_KEY_TAX = "customTaxSlabs";
const STORAGE_KEY_WH = "customWarehouses";

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

const DocGenerator = ({ items, onUpdateItems, currentUser }) => {
    // Dropdowns data
    const [suppliers, setSuppliers] = useState([]);
    const [uoms, setUoms] = useState([]);
    const [taxSlabs, setTaxSlabs] = useState([]);
    const [warehouses, setWarehouses] = useState([]);

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

    // Sync state
    const [syncInventory, setSyncInventory] = useState(false);

    // Validation errors
    const [errors, setErrors] = useState({});

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
        const savedSuppliers = loadList(STORAGE_KEY_SUP, DEFAULT_SUPPLIERS);
        setSuppliers(savedSuppliers);
        if (savedSuppliers.length > 0) {
            setSupplierName(savedSuppliers[0].name);
        }

        // Default dates
        const todayStr = new Date().toISOString().split("T")[0];
        setDocDate(todayStr);
        
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        setDueDate(nextMonth.toISOString().split("T")[0]);
    }, []);

    // Generate doc number when docType changes
    useEffect(() => {
        const prefix = docType === "invoice" ? "INV" : "PO";
        setDocNumber(generateDocNumber(prefix));
        setSelectedItems([]);
        setErrors({});
    }, [docType]);

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
            // Safe fallback for custom warehouse
            const loadedWhs = loadList(STORAGE_KEY_WH, DEFAULT_WAREHOUSES);
            setCustomWarehouse(loadedWhs[0] || "Main Warehouse");
            return;
        }

        const found = items.find(itm => String(itm.id) === String(id));
        if (found) {
            setItemPrice(found.price || "");
            setItemUom(found.uom || "Pcs");
            setItemTaxSlab(found.taxSlab || "GST 0%");
        }
    };

    // Add item to document list
    const handleAddItem = (e) => {
        e.preventDefault();
        const errs = {};
        if (!selectedItemId) errs.item = "Please select an item.";
        
        if (selectedItemId === "custom") {
            if (!customNameInput.trim()) errs.customName = "Item Name is required.";
            if (!customCodeInput.trim()) errs.customCode = "Item Code is required.";
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
                if (!window.confirm(`An item with Code "${newItemCode}" already exists in stock. Do you want to add it as a new line anyway?`)) {
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
                    if (!window.confirm(`Warning: Invoiced quantity (${alreadyAdded + Number(itemQty)}) exceeds current stock in warehouse (${currentStock} ${product.uom || 'units'}). Do you still want to add it?`)) {
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
            isCustom: selectedItemId === "custom"
        };

        setSelectedItems([...selectedItems, newDocItem]);
        
        // Reset Item fields
        setSelectedItemId("");
        setItemQty("");
        setItemPrice("");
        setCustomNameInput("");
        setCustomCodeInput("");
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

    // Clear document form
    const handleReset = () => {
        if (window.confirm("Are you sure you want to clear all fields?")) {
            setSelectedItems([]);
            setCustomerName("");
            setCustomerAddress("");
            const prefix = docType === "invoice" ? "INV" : "PO";
            setDocNumber(generateDocNumber(prefix));
            setSyncInventory(false);
            setErrors({});
        }
    };

    // Save and Sync Inventory handler
    const handleSaveDocument = (e) => {
        e.preventDefault();
        
        if (selectedItems.length === 0) {
            alert("Please add at least one item to the document.");
            return;
        }

        if (!docDate) {
            alert("Please enter Document Date.");
            return;
        }

        if (!dueDate) {
            alert("Please enter Due Date.");
            return;
        }

        if (docType === "po" && !supplierName) {
            alert("Please select a Supplier.");
            return;
        }

        if (docType === "invoice") {
            if (!customerName.trim()) {
                alert("Please enter Customer Name.");
                return;
            }
            if (!customerAddress.trim()) {
                alert("Please enter Customer Address.");
                return;
            }
        }

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
                        category_type: "Consumable", // standard fallback
                        category: "Other", // standard fallback
                        quantity: docType === "po" ? docItem.quantity : 0,
                        minThreshold: "5",
                        currency: "INR",
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

        alert(`${docType === "po" ? "Purchase Order" : "Invoice"} #${docNumber} saved successfully!`);
        
        // Reset
        setSelectedItems([]);
        setCustomerName("");
        setCustomerAddress("");
        const prefix = docType === "invoice" ? "INV" : "PO";
        setDocNumber(generateDocNumber(prefix));
        setSyncInventory(false);
        setErrors({});
    };

    return (
        <div className="doc-wrapper">
            {/* Left Column: Input Form (Form Editor) */}
            <div className="form-editor-panel no-print">
                <div className="doc-section-card">
                    <div className="doc-type-toggle">
                        <button
                            type="button"
                            className={`toggle-btn ${docType === "invoice" ? "active" : ""}`}
                            onClick={() => setDocType("invoice")}
                        >
                            <i className="bi bi-receipt-cutoff me-1"></i> Sales Invoice
                        </button>
                        <button
                            type="button"
                            className={`toggle-btn ${docType === "po" ? "active" : ""}`}
                            onClick={() => setDocType("po")}
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
                            <label className="form-label">Doc Date <span className="required-star">*</span></label>
                            <input
                                type="date"
                                className="form-input"
                                value={docDate}
                                onChange={(e) => setDocDate(e.target.value)}
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
                                onChange={(e) => setDueDate(e.target.value)}
                                onClick={(e) => {
                                    if (typeof e.target.showPicker === "function") {
                                        try { e.target.showPicker(); } catch (err) {}
                                    }
                                }}
                            />
                        </div>

                        {docType === "po" ? (
                            <div className="form-group">
                                <label className="form-label">Supplier <span className="required-star">*</span></label>
                                <select
                                    className="form-input"
                                    value={supplierName}
                                    onChange={(e) => setSupplierName(e.target.value)}
                                >
                                    {suppliers.map(sup => (
                                        <option key={sup.id || sup.name} value={sup.name}>
                                            {sup.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
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

                {/* Cart Selector Panel */}
                <div className="doc-section-card mt-3">
                    <h5 className="section-card-title">
                        <i className="bi bi-plus-circle-fill text-primary me-2"></i> Add Items
                    </h5>
                    <form onSubmit={handleAddItem} className="item-picker-grid">
                        <div className="form-group full-row">
                            <label className="form-label">Select Inventory Item</label>
                            <select
                                className={`form-input ${errors.item ? "is-invalid" : ""}`}
                                value={selectedItemId}
                                onChange={handleItemSelection}
                            >
                                <option value="">-- Choose Item from Stock --</option>
                                {docType === "po" && (
                                    <option value="custom">+ Add Custom / New Item (Not in stock)</option>
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
                                    />
                                    {errors.customCode && <span className="error-text">{errors.customCode}</span>}
                                </div>
                                <div className="form-group full-row">
                                    <label className="form-label">Target Warehouse <span className="required-star">*</span></label>
                                    <select
                                        className="form-input"
                                        value={customWarehouse}
                                        onChange={(e) => setCustomWarehouse(e.target.value)}
                                    >
                                        {warehouses.map(wh => (
                                            <option key={wh} value={wh}>{wh}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label className="form-label">Qty to Order</label>
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
                            <label className="form-label">Unit Price (₹)</label>
                            <input
                                type="number"
                                className={`form-input ${errors.price ? "is-invalid" : ""}`}
                                placeholder="0.00"
                                value={itemPrice}
                                onChange={(e) => setItemPrice(e.target.value)}
                            />
                            {errors.price && <span className="error-text">{errors.price}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Unit (UoM)</label>
                            <select
                                className="form-input"
                                value={itemUom}
                                onChange={(e) => setItemUom(e.target.value)}
                            >
                                {uoms.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tax Slab (GST %)</label>
                            <select
                                className="form-input"
                                value={itemTaxSlab}
                                onChange={(e) => setItemTaxSlab(e.target.value)}
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
                </div>

                {/* Cart Items Table */}
                {selectedItems.length > 0 && (
                    <div className="doc-section-card mt-3">
                        <h5 className="section-card-title">Added Items List</h5>
                        <div className="table-responsive">
                            <table className="doc-item-table">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>GST</th>
                                        <th>Total</th>
                                        <th>Action</th>
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
                                            <td>{itm.quantity} {itm.uom}</td>
                                            <td>₹{itm.price.toLocaleString()}</td>
                                            <td>{itm.taxSlab}</td>
                                            <td>₹{itm.totalAmount.toLocaleString()}</td>
                                            <td>
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
                    </div>
                )}

                {/* Final Settings & Save Panel */}
                <div className="doc-section-card mt-3">
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
                            className="doc-btn btn-print"
                            onClick={handlePrint}
                        >
                            <i className="bi bi-printer-fill me-1"></i> Print / Save PDF
                        </button>
                        <button
                            type="button"
                            className="doc-btn btn-primary"
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
                                    <p>Registered supplier contact details and warehouse logs are active.</p>
                                </div>
                            ) : (
                                <div className="party-details">
                                    <strong>{customerName || "Customer Name"}</strong>
                                    <p className="pre-wrap">{customerAddress || "Customer address details go here..."}</p>
                                </div>
                            )}
                        </div>
                        <div className="party-box text-end">
                            <div className="meta-row">
                                <span className="meta-label">{docType === "invoice" ? "Invoice No:" : "PO Number:"}</span>
                                <strong className="meta-value">{docNumber}</strong>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">Date:</span>
                                <span className="meta-value">{docDate}</span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">Due Date:</span>
                                <span className="meta-value">{dueDate}</span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">Payment Terms:</span>
                                <span className="meta-value">Net 30 Days</span>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="preview-table-container">
                        <table className="preview-item-table">
                            <thead>
                                <tr>
                                    <th style={{ width: "6%" }}>S.No</th>
                                    <th>Description / Item Details</th>
                                    <th style={{ width: "12%" }} className="text-end">Qty</th>
                                    <th style={{ width: "8%" }}>Unit</th>
                                    <th style={{ width: "14%" }} className="text-end">Price (₹)</th>
                                    <th style={{ width: "12%" }}>GST Slab</th>
                                    <th style={{ width: "14%" }} className="text-end">GST Tax (₹)</th>
                                    <th style={{ width: "16%" }} className="text-end">Amount (₹)</th>
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
                                            <td>{itm.taxSlab}</td>
                                            <td className="text-end">{itm.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="text-end">{itm.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="empty-table-placeholder">
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
    );
};

export default DocGenerator;
