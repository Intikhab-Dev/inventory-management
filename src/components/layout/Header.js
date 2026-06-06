import React, { useState, useEffect } from "react";
import "./Header.css";

const Header = ({ currentUser, onLogout, darkMode, setDarkMode, lowStockItems = [], onViewItem }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
    setShowNotifications(false);
  };

  const toggleNotifications = (e) => {
    e.stopPropagation();
    setShowNotifications(!showNotifications);
    setShowDropdown(false);
  };

  useEffect(() => {
    const handleOutsideClick = () => {
      setShowDropdown(false);
      setShowNotifications(false);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleLogoutClick = () => {
    setShowDropdown(false);
    onLogout();
  };

  const avatarInitial = currentUser && currentUser.name 
    ? currentUser.name.charAt(0).toUpperCase() 
    : "U";

  return (
    <header className="header">
      {/* 🔹 LEFT */}
      <div className="header-left">
        <div className="logo">IMS</div>

        <div className="title-box">
          <h2>Inventory</h2>
          <span>Management System</span>
        </div>
      </div>

      {/* 🔹 RIGHT */}
      <div className="header-right">
        {/* Theme Toggle Button */}
        <button
          className="theme-toggle-btn"
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? (
            <i className="bi bi-sun-fill" style={{ color: "#facc15" }}></i>
          ) : (
            <i className="bi bi-moon-fill" style={{ color: "#64748b" }}></i>
          )}
        </button>

        {/* Notifications Icon Button */}
        <div className="icon-btn-container" style={{ position: 'relative' }}>
          <button
            type="button"
            className={`icon-btn ${showNotifications ? "active" : ""}`}
            title="Notifications"
            onClick={toggleNotifications}
          >
            <i className="bi bi-bell"></i>
            {lowStockItems.length > 0 && (
              <span className="notification-badge">{lowStockItems.length}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown animate-fade-in">
              <div className="dropdown-header-title">Notifications</div>
              <div className="dropdown-divider"></div>
              <div className="notifications-list">
                {lowStockItems.length === 0 ? (
                  <div className="notification-item empty">
                    <i className="bi bi-bell-slash text-muted me-2"></i>
                    No alerts
                  </div>
                ) : (
                  lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="notification-item alert-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onViewItem) onViewItem(item);
                        setShowNotifications(false);
                      }}
                    >
                      <i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>
                      <div className="notification-content">
                        <span className="item-alert-name">{item.name}</span> is low on stock!
                        <span className="item-alert-qty">{item.quantity} units left (Limit: {item.minThreshold || 5})</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="icon-btn" title="Settings">
          <i className="bi bi-gear"></i>
        </div>

        {currentUser && (
          <div className="user-box-container">
            <div className="user-box" onClick={toggleDropdown}>
              <div className="avatar">{avatarInitial}</div>
              <span>{currentUser.name}</span>
              <i className={`bi bi-chevron-${showDropdown ? 'up' : 'down'} ms-1`} style={{ fontSize: '10px' }}></i>
            </div>

            {showDropdown && (
              <div className="header-dropdown animate-fade-in">
                <div className="dropdown-user-info">
                  <div className="dropdown-avatar">{avatarInitial}</div>
                  <div className="dropdown-details">
                    <div className="dropdown-name">{currentUser.name}</div>
                    <div className="dropdown-email">{currentUser.email}</div>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <button className="dropdown-logout-btn" onClick={handleLogoutClick}>
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;