import React, { useState, useEffect } from "react";

// Components
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./components/dashboard/Dashboard";
import ItemForm from "./components/items/ItemForm";
import ItemList from "./components/items/ItemList";
import ItemView from "./components/items/ItemView";
import ConfirmModal from "./components/common/ConfirmModal";
import ViewModal from "./components/common/ViewModal";
import Auth from "./components/auth/Auth";
import Settings from "./components/settings/Settings";
import LowStockAlert from "./components/alerts/LowStockAlert";
import SupplierManagement from "./components/suppliers/SupplierManagement";
import Reports from "./components/reports/Reports";
import StockOut from "./components/stockout/StockOut";
import StockLedger from "./components/ledger/StockLedger";
import StockTransfer from "./components/transfer/StockTransfer";
import StockAudit from "./components/audit/StockAudit";

// Services
import { authService } from "./services/authService";
import { activityService } from "./services/activityService";
import { transactionService } from "./services/transactionService";

import "./App.css";

function App() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [page, setPage] = useState(() => {
    return localStorage.getItem("current_page") || "dashboard";
  });
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");
  const [viewModal, setViewModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [toast, setToast] = useState({
    show: false,
    message: "",
  });

  // Verify authentication session on mount
  useEffect(() => {
    const session = authService.getCurrentSession();
    if (session) {
      setCurrentUser(session.user);
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    localStorage.setItem("current_page", page);
  }, [page]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") setDarkMode(true);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }

    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // 🔹 Load data
  useEffect(() => {
    try {
      const storedItems = JSON.parse(localStorage.getItem("items")) || [];
      setItems(storedItems);
    } catch {
      setItems([]);
    }
  }, []);

  // 🔹 Save helper
  const saveItems = (updatedItems) => {
    setItems(updatedItems);
    localStorage.setItem("items", JSON.stringify(updatedItems));
  };

  //  Toast helper
  const showToast = (msg) => {
    setToast({ show: true, message: msg });

    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 5000);
  };

  // 🔹 Add Item
  const handleAddItem = (item) => {
    const newItem = { ...item, id: Date.now() };
    const updatedItems = [...items, newItem];

    saveItems(updatedItems);
    activityService.addLog("add_item", `Added item "${newItem.name}" with quantity ${newItem.quantity}`, currentUser?.name);
    
    // Log stock ledger transaction
    transactionService.addTransaction({
      itemId: newItem.code,
      itemName: newItem.name,
      type: "IN",
      qty: newItem.quantity,
      reason: "Initial Stock",
      notes: newItem.description || "Initial inventory load",
      user: currentUser?.name || "System"
    });

    showToast("Item added successfully");
    setPage("list");
  };

  // 🔹 Update Item
  const handleUpdateItem = (updatedItem) => {
    const originalItem = items.find(item => item.id === updatedItem.id);
    let logDetails = `Updated item "${updatedItem.name}"`;
    let hasChanges = false;

    if (originalItem) {
      const changes = [];
      if (String(originalItem.name || '').trim() !== String(updatedItem.name || '').trim()) {
        changes.push(`name changed from "${originalItem.name}" to "${updatedItem.name}"`);
      }
      if (String(originalItem.warehouse || '').trim() !== String(updatedItem.warehouse || '').trim()) {
        changes.push(`warehouse changed from "${originalItem.warehouse || 'None'}" to "${updatedItem.warehouse || 'None'}"`);
      }
      if (String(originalItem.category_type || '').trim() !== String(updatedItem.category_type || '').trim()) {
        changes.push(`category type changed from "${originalItem.category_type || 'None'}" to "${updatedItem.category_type || 'None'}"`);
      }
      if (String(originalItem.category || '').trim() !== String(updatedItem.category || '').trim()) {
        changes.push(`category changed from "${originalItem.category || 'None'}" to "${updatedItem.category || 'None'}"`);
      }
      if (Number(originalItem.quantity) !== Number(updatedItem.quantity)) {
        changes.push(`quantity changed from ${originalItem.quantity} to ${updatedItem.quantity}`);
        const diff = Number(updatedItem.quantity) - Number(originalItem.quantity);
        transactionService.addTransaction({
          itemId: updatedItem.code,
          itemName: updatedItem.name,
          type: diff > 0 ? "IN" : "OUT",
          qty: Math.abs(diff),
          reason: diff > 0 ? "Manual Adjustment (Increase)" : "Manual Adjustment (Decrease)",
          notes: "Quantity updated via item details update",
          user: currentUser?.name || "System"
        });
      }
      if (Number(originalItem.minThreshold || 0) !== Number(updatedItem.minThreshold || 0)) {
        changes.push(`threshold changed from ${originalItem.minThreshold || 0} to ${updatedItem.minThreshold || 0}`);
      }
      if (String(originalItem.currency || '').trim() !== String(updatedItem.currency || '').trim()) {
        changes.push(`currency changed from "${originalItem.currency || 'None'}" to "${updatedItem.currency || 'None'}"`);
      }
      if (Number(originalItem.price) !== Number(updatedItem.price)) {
        changes.push(`price changed from ${originalItem.price} to ${updatedItem.price}`);
      }
      if (Number(originalItem.tax || 0) !== Number(updatedItem.tax || 0)) {
        changes.push(`tax changed from ${originalItem.tax || 0} to ${updatedItem.tax || 0}`);
      }
      if (String(originalItem.supplier || '').trim() !== String(updatedItem.supplier || '').trim()) {
        changes.push(`supplier changed from "${originalItem.supplier || 'None'}" to "${updatedItem.supplier || 'None'}"`);
      }
      if (String(originalItem.code || '').trim() !== String(updatedItem.code || '').trim()) {
        changes.push(`item code changed from "${originalItem.code || 'None'}" to "${updatedItem.code || 'None'}"`);
      }
      if (String(originalItem.status) !== String(updatedItem.status)) {
        changes.push(`status changed from ${originalItem.status === "1" ? "Active" : "Inactive"} to ${updatedItem.status === "1" ? "Active" : "Inactive"}`);
      }
      if (String(originalItem.description || '').trim() !== String(updatedItem.description || '').trim()) {
        changes.push(`description changed`);
      }
      if (String(originalItem.purchaseDate || '').trim() !== String(updatedItem.purchaseDate || '').trim()) {
        changes.push(`purchase date changed from "${originalItem.purchaseDate || 'None'}" to "${updatedItem.purchaseDate || 'None'}"`);
      }
      if (String(originalItem.billNumber || '').trim() !== String(updatedItem.billNumber || '').trim()) {
        changes.push(`bill number changed from "${originalItem.billNumber || 'None'}" to "${updatedItem.billNumber || 'None'}"`);
      }
      if (String(originalItem.billDate || '').trim() !== String(updatedItem.billDate || '').trim()) {
        changes.push(`bill date changed from "${originalItem.billDate || 'None'}" to "${updatedItem.billDate || 'None'}"`);
      }
      if (String(originalItem.poNumber || '').trim() !== String(updatedItem.poNumber || '').trim()) {
        changes.push(`PO number changed from "${originalItem.poNumber || 'None'}" to "${updatedItem.poNumber || 'None'}"`);
      }
      if (String(originalItem.imageUrl || '').trim() !== String(updatedItem.imageUrl || '').trim()) {
        changes.push(`image URL changed`);
      }
      if (
        (originalItem.fileAttachment?.name || '') !== (updatedItem.fileAttachment?.name || '') ||
        (originalItem.fileAttachment?.base64 || '') !== (updatedItem.fileAttachment?.base64 || '')
      ) {
        changes.push(`file attachment updated`);
      }
      
      if (changes.length > 0) {
        logDetails += `: ${changes.join(", ")}`;
        hasChanges = true;
      }
    }

    const updatedItems = items.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );

    saveItems(updatedItems);
    
    if (hasChanges) {
      activityService.addLog("update_item", logDetails, currentUser?.name);
    }
    showToast("Item updated successfully");

    setSelectedItem(null);
    setPage("list");
  };

  // 🔹 Duplicate Item
  const handleDuplicateItem = (item) => {
    const newItem = {
      ...item,
      id: Date.now(),
      name: `${item.name} (Copy)`,
      createdDate: String(Date.now()),
    };
    const updatedItems = [...items, newItem];
    saveItems(updatedItems);
    activityService.addLog("add_item", `Duplicated item "${item.name}" as "${newItem.name}"`, currentUser?.name);
    showToast(`"${item.name}" duplicated successfully`);
  };

  // 🔹 Stock Update (from StockLogModal)
  const handleStockUpdate = (itemId, delta) => {
    let updatedItemObj = null;
    const updatedItems = items.map(item => {
      if (String(item.id) === String(itemId)) {
        const currentQty = Number(item.quantity) || 0;
        const newQty = Math.max(0, currentQty + delta);
        const actualDelta = newQty - currentQty;
        
        if (actualDelta !== 0) {
          updatedItemObj = { ...item, quantity: newQty };
          // Log stock ledger transaction
          transactionService.addTransaction({
            itemId: item.code,
            itemName: item.name,
            type: actualDelta > 0 ? "IN" : "OUT",
            qty: Math.abs(actualDelta),
            reason: actualDelta > 0 ? "Restock" : "Sales / Dispatch",
            notes: "Quick stock adjustment from list logs",
            user: currentUser?.name || "System"
          });
          return updatedItemObj;
        }
      }
      return item;
    });

    if (updatedItemObj) {
      saveItems(updatedItems);
      setItems(updatedItems);
      const dir = delta > 0 ? `+${delta}` : String(delta);
      activityService.addLog("update_item", `Stock adjusted by ${dir} for item "${updatedItemObj.name}"`, currentUser?.name);
    }
  };

  // 🔹 Quick Stock Adjustment (from ViewModal)
  const handleAdjustStock = (itemId, qty, type, reason, notes) => {
    const qtyChange = Number(qty);
    if (isNaN(qtyChange) || qtyChange <= 0) return;

    let updatedSelectedItem = null;

    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const currentQty = Number(item.quantity) || 0;
        const newQty = type === "IN" ? currentQty + qtyChange : Math.max(0, currentQty - qtyChange);
        const actualChange = newQty - currentQty;
        
        if (actualChange === 0) return item;

        // Log transaction
        transactionService.addTransaction({
          itemId: item.code,
          itemName: item.name,
          type: actualChange > 0 ? "IN" : "OUT",
          qty: Math.abs(actualChange),
          reason: reason || (actualChange > 0 ? "Restock" : "Dispatch"),
          notes: notes || "Quick stock adjustment",
          user: currentUser?.name || "System"
        });

        // Log activity log
        activityService.addLog(
          "update_item",
          `Adjusted stock for "${item.name}" (Qty: ${currentQty} -> ${newQty}, Reason: ${reason})`,
          currentUser?.name
        );

        updatedSelectedItem = { ...item, quantity: newQty };
        return updatedSelectedItem;
      }
      return item;
    });

    if (updatedSelectedItem) {
      setItems(updatedItems);
      saveItems(updatedItems);
      setSelectedItem(updatedSelectedItem);
      showToast("Stock adjusted successfully");
    }
  };

  // 🔹 Stock Out / Dispatch Handler
  const handleStockOut = (itemId, qty, reason, dispatchedTo, notes) => {
    const qtyChange = Number(qty);
    if (isNaN(qtyChange) || qtyChange <= 0) return;

    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        const currentQty = Number(item.quantity) || 0;
        const newQty = Math.max(0, currentQty - qtyChange);
        const actualChange = newQty - currentQty;
        
        if (actualChange === 0) return item;

        // Log transaction
        transactionService.addTransaction({
          itemId: item.code,
          itemName: item.name,
          type: "OUT",
          qty: Math.abs(actualChange),
          reason: reason || "Sales / Dispatch",
          notes: `${notes || ""} (Dispatched to: ${dispatchedTo})`,
          user: currentUser?.name || "System"
        });

        // Log activity log
        activityService.addLog(
          "update_item",
          `Dispatched ${Math.abs(actualChange)} units of "${item.name}" to "${dispatchedTo}" (Reason: ${reason})`,
          currentUser?.name
        );

        return { ...item, quantity: newQty };
      }
      return item;
    });

    setItems(updatedItems);
    saveItems(updatedItems);
    showToast("Stock dispatched successfully");
  };

  // 🔹 Stock Transfer Handler
  const handleStockTransfer = (itemId, sourceWh, targetWh, qty, notes, billNumber = "", billDate = "", poNumber = "") => {
    const qtyNum = Number(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) return;

    const sourceItem = items.find(i => i.id === itemId);
    if (!sourceItem) return;

    // Decrement source item stock
    const updatedItems = items.map(i => {
      if (i.id === itemId) {
        const nextQty = Math.max(0, (Number(i.quantity) || 0) - qtyNum);
        return {
          ...i,
          quantity: nextQty,
          total: nextQty * (Number(i.price) || 0)
        };
      }
      return i;
    });

    // Check if item with matching code already exists in target warehouse
    const targetIdx = updatedItems.findIndex(
      i => i.code === sourceItem.code &&
      (i.warehouse || "").trim().toLowerCase() === targetWh.trim().toLowerCase()
    );

    let finalItems = [...updatedItems];
    if (targetIdx !== -1) {
      // Exists in target warehouse -> increment target item stock
      const targetItem = finalItems[targetIdx];
      const nextQty = (Number(targetItem.quantity) || 0) + qtyNum;
      finalItems[targetIdx] = {
        ...targetItem,
        quantity: nextQty,
        total: nextQty * (Number(targetItem.price) || 0),
        billNumber: billNumber || targetItem.billNumber || "",
        billDate: billDate || targetItem.billDate || "",
        poNumber: poNumber || targetItem.poNumber || ""
      };
    } else {
      // Does not exist -> create new row duplicating details but with target warehouse & transfer quantity
      const newItem = {
        ...sourceItem,
        id: Date.now() + Math.floor(Math.random() * 1000),
        warehouse: targetWh.trim(),
        quantity: qtyNum,
        total: qtyNum * (Number(sourceItem.price) || 0),
        createdDate: String(Date.now()),
        billNumber: billNumber || sourceItem.billNumber || "",
        billDate: billDate || sourceItem.billDate || "",
        poNumber: poNumber || sourceItem.poNumber || ""
      };
      finalItems.push(newItem);
    }

    saveItems(finalItems);
    setItems(finalItems);

    // Log activity
    activityService.addLog(
      "update_item",
      `Transferred ${qtyNum} units of "${sourceItem.name}" from "${sourceWh}" to "${targetWh}"`,
      currentUser?.name
    );

    // Log ledger transactions (OUT for source, IN for target)
    transactionService.addTransaction({
      itemId: sourceItem.code,
      itemName: sourceItem.name,
      type: "OUT",
      qty: qtyNum,
      reason: `Transfer OUT (to ${targetWh})`,
      notes: notes || `Stock transfer to ${targetWh}`,
      user: currentUser?.name || "System"
    });

    transactionService.addTransaction({
      itemId: sourceItem.code,
      itemName: sourceItem.name,
      type: "IN",
      qty: qtyNum,
      reason: `Transfer IN (from ${sourceWh})`,
      notes: notes || `Stock transfer from ${sourceWh}`,
      user: currentUser?.name || "System"
    });

    showToast("Stock transfer completed successfully");
    setPage("list");
  };

  // 🔹 Stock Audit Reconciliation Handler
  const handleCompleteAudit = (adjustments, warehouse) => {
    if (!adjustments || adjustments.length === 0) return;

    let adjustedCount = 0;
    const updatedItems = items.map(item => {
      const adj = adjustments.find(a => String(a.id) === String(item.id));
      if (adj && adj.countedQty !== "") {
        const currentQty = Number(item.quantity) || 0;
        const nextQty = Number(adj.countedQty);
        const delta = nextQty - currentQty;

        if (delta !== 0) {
          adjustedCount++;
          // Log transaction
          transactionService.addTransaction({
            itemId: item.code,
            itemName: item.name,
            type: delta > 0 ? "IN" : "OUT",
            qty: Math.abs(delta),
            reason: "Inventory Audit Reconciliation",
            notes: `Adjusted via stock take audit for ${warehouse || "All Warehouses"}.`,
            user: currentUser?.name || "System"
          });

          // Log activity
          activityService.addLog(
            "update_item",
            `Reconciled stock for "${item.name}" from ${currentQty} to ${nextQty} (Variance: ${delta > 0 ? '+' : ''}${delta})`,
            currentUser?.name
          );

          return {
            ...item,
            quantity: nextQty,
            total: nextQty * (Number(item.price) || 0)
          };
        }
      }
      return item;
    });

    if (adjustedCount > 0) {
      saveItems(updatedItems);
      setItems(updatedItems);
      showToast(`Audit reconciliation completed. ${adjustedCount} items updated.`);
    } else {
      showToast("Audit completed. No stock discrepancies found.");
    }
    setPage("list");
  };

  // 🔹 Delete Item
  const handleDelete = (id) => {
    const deletedItem = items.find(item => item.id === id);
    const updatedItems = items.filter((item) => item.id !== id);
    
    saveItems(updatedItems);
    if (deletedItem) {
      activityService.addLog("delete_item", `Deleted item "${deletedItem.name}"`, currentUser?.name);
    }
    showToast("Item deleted successfully");

    if (selectedItem && selectedItem.id === id) {
      setSelectedItem(null);
      setPage("list");
    }
  };

  // 🔹 Confirm Delete
  const confirmDelete = () => {
    handleDelete(deleteId);
    setShowModal(false);
  };

  const openDeleteModal = (item) => {
    setDeleteId(item.id);
    setDeleteName(item.name);
    setShowModal(true);
  };

  // Logout handler
  const handleLogout = async () => {
    if (currentUser) {
      activityService.addLog("logout", "Logged out of session", currentUser.name);
    }
    const res = await authService.logout();
    if (res.success) {
      setCurrentUser(null);
      setPage("dashboard");
      showToast(res.message);
    }
  };

  // 1. Loading state during auth check
  if (checkingAuth) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#fff" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // 2. Render Login/Signup if not authenticated
  if (!currentUser) {
    return (
      <>
        {toast.show && <div className="toast-box">{toast.message}</div>}
        <Auth onAuthSuccess={(user) => setCurrentUser(user)} showToast={showToast} />
      </>
    );
  }

  // 3. Render Main Application if authenticated
  const lowStockItems = items.filter(
    (item) => Number(item.quantity) <= (Number(item.minThreshold) || 5)
  );

  const getPageTitle = () => {
    switch (page) {
      case "dashboard":
        return "Dashboard Overview";
      case "list":
        return "Inventory Catalog";
      case "add":
        return selectedItem ? "Edit Inventory Item" : "Add New Item";
      case "suppliers":
        return "Supplier Directory";
      case "stockout":
        return "Stock Out (Dispatch)";
      case "transfer":
        return "Stock Warehouse Transfer";
      case "audit":
        return "Physical Inventory Audit";
      case "ledger":
        return "Stock Transaction Ledger";
      case "reports":
        return "Reports & Analytics";
      case "alerts":
        return "Low Stock Alerts";
      case "settings":
        return "System Settings";
      default:
        return "Control Panel";
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        page={page}
        setPage={setPage}
        items={items}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onAddClick={() => {
          setSelectedItem(null);
        }}
      />

      <div className={`main-content-container ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          lowStockItems={lowStockItems}
          pageTitle={getPageTitle()}
          onViewItem={(item) => {
            setSelectedItem(item);
            setViewModal(true);
          }}
        />

        <div className="page-content">
          {/* 🔹 Pages */}
          {page === "dashboard" && <Dashboard items={items} darkMode={darkMode} />}

          {page === "list" && (
            <ItemList
              items={items}
              onView={(item) => {
                setSelectedItem(item);
                setViewModal(true);
              }}
              onDelete={handleDelete}
              onEdit={(item) => {
                setSelectedItem(item);
                setPage("add");
              }}
              openDeleteModal={openDeleteModal}
              onDuplicate={handleDuplicateItem}
              onStockUpdate={handleStockUpdate}
            />
          )}

          {page === "alerts" && (
            <LowStockAlert
              items={items}
              onView={(item) => { setSelectedItem(item); setViewModal(true); }}
              onEdit={(item) => { setSelectedItem(item); setPage("add"); }}
            />
          )}

          {page === "suppliers" && <SupplierManagement items={items} />}

          {page === "stockout" && (
            <StockOut items={items} onStockOut={handleStockOut} />
          )}

          {page === "transfer" && (
            <StockTransfer items={items} onTransfer={handleStockTransfer} />
          )}

          {page === "audit" && (
            <StockAudit items={items} onCompleteAudit={handleCompleteAudit} />
          )}

          {page === "ledger" && (
            <StockLedger />
          )}

          {page === "reports" && <Reports items={items} />}

          {page === "settings" && <Settings />}

          {page === "add" && (
            <ItemForm
              onAdd={selectedItem ? handleUpdateItem : handleAddItem}
              editData={selectedItem}
            />
          )}

          {page === "view" && selectedItem && (
            <ItemView item={selectedItem} onBack={() => setPage("list")} />
          )}
        </div>
      </div>

      <ConfirmModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={confirmDelete}
        itemName={deleteName}
      />

      <ViewModal
        show={viewModal}
        item={selectedItem}
        onClose={() => setViewModal(false)}
        onAdjustStock={handleAdjustStock}
      />

      {/* Toast */}
      {toast.show && <div className="toast-box">{toast.message}</div>}
    </div>
  );
}

export default App;