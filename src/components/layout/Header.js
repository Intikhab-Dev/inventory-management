import React, { useState, useEffect, useMemo } from "react";
import "./Header.css";

const Header = ({ currentUser, onLogout, darkMode, setDarkMode, lowStockItems = [], onViewItem, pageTitle }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("dismissed_alerts")) || [];
    } catch {
      return [];
    }
  });

  // Keep dismissed IDs in sync with current low-stock status to allow future alerts
  useEffect(() => {
    const lowStockIds = lowStockItems.map(item => item.id);
    const activeDismissed = dismissedAlerts.filter(id => lowStockIds.includes(id));
    if (activeDismissed.length !== dismissedAlerts.length) {
      setDismissedAlerts(activeDismissed);
      localStorage.setItem("dismissed_alerts", JSON.stringify(activeDismissed));
    }
  }, [lowStockItems]);

  const visibleAlerts = useMemo(() => {
    return lowStockItems.filter(item => !dismissedAlerts.includes(item.id));
  }, [lowStockItems, dismissedAlerts]);

  const handleDismissAlert = (e, itemId) => {
    e.stopPropagation();
    const updated = [...dismissedAlerts, itemId];
    setDismissedAlerts(updated);
    localStorage.setItem("dismissed_alerts", JSON.stringify(updated));
  };

  const handleDismissAll = (e) => {
    e.stopPropagation();
    const allIds = lowStockItems.map(item => item.id);
    const updated = [...new Set([...dismissedAlerts, ...allIds])];
    setDismissedAlerts(updated);
    localStorage.setItem("dismissed_alerts", JSON.stringify(updated));
  };

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
      <div className="header-inner">
        {/* 🔹 LEFT */}
        <div className="header-left">
          <div className="title-box">
            <h2>{pageTitle || "Dashboard Overview"}</h2>
            <span>IMS Control Panel</span>
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
              {visibleAlerts.length > 0 && (
                <span className="notification-badge">{visibleAlerts.length}</span>
              )}
            </button>

            {showNotifications && (
              <div className="notifications-dropdown animate-fade-in">
                <div className="dropdown-header-title d-flex justify-content-between align-items-center">
                  <span>Alerts & Notifications</span>
                  {visibleAlerts.length > 0 && (
                    <button className="dismiss-all-btn" onClick={handleDismissAll}>
                      Dismiss All
                    </button>
                  )}
                </div>
                <div className="dropdown-divider"></div>
                <div className="notifications-list">
                  {visibleAlerts.length === 0 ? (
                    <div className="notification-item empty">
                      <i className="bi bi-bell-slash text-muted me-2"></i>
                      No alerts
                    </div>
                  ) : (
                    visibleAlerts.map((item) => (
                      <div
                        key={item.id}
                        className="notification-item alert-item d-flex align-items-start justify-content-between"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onViewItem) onViewItem(item);
                          setShowNotifications(false);
                        }}
                      >
                        <div className="d-flex align-items-start text-start">
                          <i className="bi bi-exclamation-triangle-fill text-danger me-2 mt-1"></i>
                          <div className="notification-content">
                            <span className="item-alert-name">{item.name}</span> is low on stock!
                            <span className="item-alert-qty">{item.quantity} {item.uom || "units"} left (Limit: {item.minThreshold || 5} {item.uom || "units"})</span>
                          </div>
                        </div>
                        <button
                          className="dismiss-single-btn"
                          onClick={(e) => handleDismissAlert(e, item.id)}
                          title="Dismiss Alert"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
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
      </div>
    </header>
  );
};

export default Header;