import React, { useState, useEffect } from "react";

// Components
import Header from "./components/layout/Header";
import Dashboard from "./components/dashboard/Dashboard";
import ItemForm from "./components/items/ItemForm";
import ItemList from "./components/items/ItemList";
import ItemView from "./components/items/ItemView";
import ConfirmModal from "./components/common/ConfirmModal";
import ViewModal from "./components/common/ViewModal";
import Auth from "./components/auth/Auth";

// Services
import { authService } from "./services/authService";
import { activityService } from "./services/activityService";

import "./App.css";

function App() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");
  const [viewModal, setViewModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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

  return (
    <div>
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        lowStockItems={lowStockItems}
        onViewItem={(item) => {
          setSelectedItem(item);
          setViewModal(true);
        }}
      />

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
      />

      {/*  Toast */}
      {toast.show && <div className="toast-box">{toast.message}</div>}

      {/*  Navigation */}
      <div className="nav-container">

        <button
          className={`nav-btn ${page === "dashboard" ? "active" : ""}`}
          onClick={() => setPage("dashboard")}
        >
          <i className="bi bi-speedometer2"></i>
          <span>Dashboard</span>
        </button>

        <button
          className={`nav-btn ${page === "list" ? "active" : ""}`}
          onClick={() => setPage("list")}
        >
          <i className="bi bi-list-ul"></i>
          <span>Item List</span>
        </button>

        <button
          className={`nav-btn ${page === "add" ? "active" : ""}`}
          onClick={() => {
            setSelectedItem(null);
            setPage("add");
          }}
        >
          <i className="bi bi-plus-circle"></i>
          <span>Add Item</span>
        </button>

      </div>

      {/* 🔹 Pages */}
      {page === "dashboard" && <Dashboard items={items} />}

      {page === "list" && (
        <ItemList
          items={items}
          onView={(item) => {
            setSelectedItem(item);
            setViewModal(true); //  modal open
          }}
          onDelete={handleDelete}
          onEdit={(item) => {
            setSelectedItem(item);
            setPage("add");
          }}
          openDeleteModal={openDeleteModal}   //  ADD THIS
        />
      )}

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
  );
}

export default App;