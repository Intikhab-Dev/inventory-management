import React, { useState, useEffect } from "react";

// Components
import Header from "./components/layout/Header";
import Dashboard from "./components/dashboard/Dashboard";
import ItemForm from "./components/items/ItemForm";
import ItemList from "./components/items/ItemList";
import ItemView from "./components/items/ItemView";
import ConfirmModal from "./components/common/ConfirmModal";
import ViewModal from "./components/common/ViewModal";

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

  const [toast, setToast] = useState({
    show: false,
    message: "",
  });

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
    showToast("Item added successfully");

    setPage("list");
  };

  // 🔹 Update Item
  const handleUpdateItem = (updatedItem) => {
    const updatedItems = items.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );

    saveItems(updatedItems);

    showToast("Item updated successfully");

    setSelectedItem(null);
    setPage("list");
  };

  // 🔹 Delete Item
  const handleDelete = (id) => {
    const updatedItems = items.filter((item) => item.id !== id);
    saveItems(updatedItems);

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

  return (
    <div>
      <Header />

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

        {/* <button
          className="theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? (
            <i className="bi bi-sun-fill"></i>
          ) : (
            <i className="bi bi-moon-fill"></i>
          )}
        </button> */}

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