import React, { useState, useEffect, useMemo } from "react";
import "./Sidebar.css";

const Sidebar = ({ page, setPage, items = [], onAddClick, collapsed, setCollapsed }) => {
    const lowStockCount = items.filter(
        (item) => Number(item.quantity) <= (Number(item.minThreshold) || 5)
    ).length;

    // Load custom sidebar order from localStorage on init
    const [menuOrder, setMenuOrder] = useState(() => {
        try {
            const saved = localStorage.getItem("custom_sidebar_order");
            return saved ? JSON.parse(saved) : [
                "dashboard", "add", "list", "suppliers", "stockout", "transfer",
                "audit", "ledger", "reports", "documents", "alerts", "settings"
            ];
        } catch {
            return [
                "dashboard", "add", "list", "suppliers", "stockout", "transfer",
                "audit", "ledger", "reports", "documents", "alerts", "settings"
            ];
        }
    });

    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    // Define raw layout items with their configurations
    const rawNavItems = useMemo(() => [
        { id: "dashboard", label: "Dashboard", icon: "bi-speedometer2" },
        { id: "add",       label: "Add Item",   icon: "bi-plus-circle", action: onAddClick },
        { id: "list",      label: "Item List",  icon: "bi-boxes" },
        { id: "suppliers", label: "Suppliers",  icon: "bi-truck" },
        { id: "stockout",  label: "Stock Out",  icon: "bi-arrow-up-right-circle" },
        { id: "transfer",  label: "Stock Transfer", icon: "bi-arrow-left-right" },
        { id: "audit",     label: "Stock Audit", icon: "bi-clipboard-check" },
        { id: "ledger",    label: "Stock Ledger", icon: "bi-clock-history" },
        { id: "reports",   label: "Reports",    icon: "bi-bar-chart-line" },
        { id: "documents", label: "Invoice/PO", icon: "bi-file-earmark-pdf" },
        { id: "alerts",    label: "Low Stock",  icon: "bi-exclamation-triangle", badge: lowStockCount },
        { id: "settings",  label: "Settings",   icon: "bi-gear" }
    ], [onAddClick, lowStockCount]);

    // Sort items based on custom order array
    const navItems = useMemo(() => {
        const sorted = [];
        menuOrder.forEach((id) => {
            if (id === "dashboard") return;
            const found = rawNavItems.find((item) => item.id === id);
            if (found) {
                sorted.push(found);
            }
        });
        // Safety check to append new items if any
        rawNavItems.forEach((item) => {
            if (item.id === "dashboard") return;
            if (!sorted.some((s) => s.id === item.id)) {
                sorted.push(item);
            }
        });
        
        // Always prepend Dashboard to the top of the list
        const dashboardItem = rawNavItems.find(item => item.id === "dashboard");
        if (dashboardItem) {
            sorted.unshift(dashboardItem);
        }
        return sorted;
    }, [menuOrder, rawNavItems]);


    // HTML5 Drag and Drop event handlers
    const handleDragStart = (e, index) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index.toString());
        
        // Set the drag ghost image to the entire container
        const container = e.currentTarget.closest(".sidebar-link-container");
        if (container) {
            e.dataTransfer.setDragImage(container, 20, 20);
        }
        
        // Set draggedIndex in a setTimeout so the browser captures the drag image at full opacity
        setTimeout(() => {
            setDraggedIndex(index);
        }, 0);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        // Prevent showing drag-over indicator on or above Dashboard
        if (draggedIndex === null || index === 0) return;
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e, index) => {
        e.preventDefault();
        // Redirect drop on Dashboard (index 0) to index 1 (directly below Dashboard)
        const targetIndex = index === 0 ? 1 : index;
        
        if (draggedIndex === null || draggedIndex === targetIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newOrder = navItems.map(item => item.id);
        const draggedId = newOrder[draggedIndex];
        
        // Remove from old position and insert at new position
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedId);

        setMenuOrder(newOrder);
        localStorage.setItem("custom_sidebar_order", JSON.stringify(newOrder));
        
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            {/* Header Actions (Toggle Collapse) */}
            <div className="sidebar-header-actions">
                <button
                    type="button"
                    className="sidebar-toggle-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <i className={`bi ${collapsed ? "bi-list" : "bi-x-lg"}`}></i>
                </button>
            </div>

            {/* Logo Brand Section */}
            <div className="sidebar-brand">
                <div className="brand-logo">
                    <i className="bi bi-box-seam-fill"></i>
                </div>
                {!collapsed && (
                    <div className="brand-text" style={{ flexGrow: 1 }}>
                        <h1>IMS Pro</h1>
                        <span>Inventory System</span>
                    </div>
                )}
            </div>

            {/* Navigation links */}
            <nav className={`sidebar-menu ${draggedIndex !== null ? "is-dragging" : ""}`}>
                {navItems.map((item, index) => {
                    const isActive = page === item.id;
                    return (
                        <div
                            key={item.id}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            className={`sidebar-link-container ${draggedIndex === index ? "dragging" : ""} ${
                                dragOverIndex === index && draggedIndex !== index
                                    ? dragOverIndex < draggedIndex
                                        ? "drag-over-above"
                                        : "drag-over-below"
                                    : ""
                            }`}
                        >
                            <div
                                role="button"
                                tabIndex="0"
                                className={`sidebar-link ${isActive ? "active" : ""}`}
                                onClick={() => {
                                    if (item.action) item.action();
                                    setPage(item.id);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        if (item.action) item.action();
                                        setPage(item.id);
                                    }
                                }}
                            >
                                <span className="link-icon-wrapper">
                                    <i className={`bi ${item.icon}`}></i>
                                </span>
                                {!collapsed && <span className="link-label">{item.label}</span>}
                                {item.badge > 0 && (
                                    <span className={`link-badge ${collapsed ? "collapsed-badge" : ""}`}>{item.badge}</span>
                                )}
                                
                                {/* Drag Handle (visible on hover, acts as the drag trigger) */}
                                {!collapsed && item.id !== "dashboard" && (
                                    <span
                                        className="grip-handle"
                                        title="Drag to Reorder"
                                        draggable={true}
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragEnd={handleDragEnd}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                    >
                                        <i className="bi bi-grip-vertical"></i>
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Sidebar Footer */}
            <div className="sidebar-footer">
                {!collapsed && <p>© 2026 Admin Portal</p>}
                {!collapsed && <span className="version-tag">v1.2.4</span>}
                {collapsed && <span className="version-tag">v1.2</span>}
            </div>
        </aside>
    );
};

export default Sidebar;
