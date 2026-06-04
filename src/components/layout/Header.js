import React from "react";
import "./Header.css";

const Header = () => {
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

      {/* 🔹 CENTER (Search) */}
      {/* <div className="header-center">
        <input type="text" placeholder="Search items..." />
      </div> */}

      {/* 🔹 RIGHT */}
      <div className="header-right">
        <div className="icon-btn">🔔</div>
        <div className="icon-btn">⚙</div>

        <div className="user-box">
          <div className="avatar">I</div>
          <span>Admin</span>
        </div>
      </div>
    </header>
  );
};

export default Header;