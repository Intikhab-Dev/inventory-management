import React from "react";
import "./Sidebar.css";

const Sidebar = ({ page, setPage, items = [], onAddClick, collapsed, setCollapsed }) => {
    const lowStockCount = items.filter(
        (item) => Number(item.quantity) <= (Number(item.minThreshold) || 5)
    ).length;

    const navItems = [
        { id: "dashboard", label: "Dashboard", icon: "bi-speedometer2" },
        { id: "add",       label: "Add Item",   icon: "bi-plus-circle", action: onAddClick },
        { id: "list",      label: "Item List",  icon: "bi-boxes" },
        { id: "suppliers", label: "Suppliers",  icon: "bi-truck" },
        { id: "stockout",  label: "Stock Out",  icon: "bi-arrow-up-right-circle" },
        { id: "transfer",  label: "Stock Transfer", icon: "bi-arrow-left-right" },
        { id: "audit",     label: "Stock Audit", icon: "bi-clipboard-check" },
        { id: "ledger",    label: "Stock Ledger", icon: "bi-clock-history" },
        { id: "reports",   label: "Reports",    icon: "bi-bar-chart-line" },
        { id: "alerts",    label: "Low Stock",  icon: "bi-exclamation-triangle", badge: lowStockCount },
        { id: "settings",  label: "Settings",   icon: "bi-gear" }
    ];

    return (
        <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            {/* Logo Brand Section */}
            <div className="sidebar-brand">
                <div className="brand-logo">
                    <i className="bi bi-box-seam-fill"></i>
                </div>
                {!collapsed && (
                    <div className="brand-text">
                        <h1>IMS Pro</h1>
                        <span>Inventory System</span>
                    </div>
                )}
            </div>

            {/* Navigation links */}
            <nav className="sidebar-menu">
                {navItems.map((item) => {
                    const isActive = page === item.id;
                    return (
                        <button
                            key={item.id}
                            className={`sidebar-link ${isActive ? "active" : ""}`}
                            onClick={() => {
                                if (item.action) item.action();
                                setPage(item.id);
                            }}
                        >
                            <span className="link-icon-wrapper">
                                <i className={`bi ${item.icon}`}></i>
                            </span>
                            {!collapsed && <span className="link-label">{item.label}</span>}
                            {item.badge > 0 && (
                                <span className={`link-badge ${collapsed ? "collapsed-badge" : ""}`}>{item.badge}</span>
                            )}
                        </button>
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
