# IMS - Inventory Management System

A modern, responsive, and self-contained **Inventory Management System (IMS)** designed for small-to-medium enterprises. The system is built with **React 19**, **Bootstrap 5**, and custom **CSS3 variables** featuring light/dark theme toggle, interactive charts, physical auditing capabilities, and document generation.

---

## 🌟 Key Features

*   **📊 Dynamic Dashboard Analytics:** 
    *   Real-time status KPI cards (Total Items, Stock Value, Out-of-Stock, Low Stock).
    *   Interactive charts mapping stock quantities, values, category distributions, and warehouse capacities using **Chart.js** & **Highcharts**.
*   **📦 Rich Catalog Management:** 
    *   Full CRUD operation for inventory items.
    *   Custom attributes: Code/SKU, categories, Units of Measurement (UoM), threshold alerts, and images.
    *   Easy duplicating tool to quick-add similar products.
    *   Built-in **QR Code generator** for tagging shelves/products.
*   **🏢 Warehouse & Stock Control:**
    *   **Stock Out / Dispatch:** Track and log items dispatched to customers or internal teams.
    *   **Warehouse Stock Transfer:** Move quantities between warehouses (e.g. Main, Cold Storage, Secondary) with auto-merging of matching SKUs.
    *   **Physical Auditing:** Pick a warehouse, perform a physical count, calculate variances/discrepancies, and reconcile storage with one click.
*   **📝 Document & Invoice Generator:**
    *   Draft official client invoices and vendor Purchase Orders (POs).
    *   Integrated auto-calculation for discounts, tax slabs (GST), and totals.
    *   Responsive, clean print layouts for PDF saving/printing.
*   **🔐 Secure Mock Auth System:**
    *   Admin sign-up and login panel utilizing client-side **SHA-256 Web Crypto API** hashing.
    *   Session management with automated end-of-day expiration.
*   **📜 System Log & Audit Trail:**
    *   Detailed Activity Log tracking operator action histories (e.g., login, updates, deletions).
    *   Detailed Transaction Ledger logging every `IN` and `OUT` with timestamps, counts, reasons, and operators.
*   **⚙️ Custom Settings:**
    *   Manage custom category lists, custom warehouse names, custom Units of Measurement, and tax (GST) slab rates stored inside local configurations.

---

## 🛠️ Technology Stack

*   **Core Framework:** React (v19)
*   **Styling:** Custom Vanilla CSS (Dark/Light mode support, modern layouts, and micro-animations)
*   **Layout Framework:** Bootstrap 5 (with Bootstrap Icons)
*   **Analytics & Charts:** Chart.js, react-chartjs-2, Highcharts
*   **Utilities:** SheetJS (xlsx) for Excel exports, QRCode.js for generating labels
*   **Authentication:** Web Crypto API (SHA-256)
*   **Storage Database:** LocalStorage API (Mock Relational Model)

---

## 📂 Project Structure

```text
inventory-management/
├── public/                 # Static assets
│   ├── favicon.png        # Custom IMS Favicon
│   ├── index.html          # HTML Entrypoint
│   └── manifest.json       # App Metadata
├── src/
│   ├── components/         # Module Components
│   │   ├── alerts/         # Low Stock alert page
│   │   ├── audit/          # Physical count & reconciliation page
│   │   ├── auth/           # Login & Signup screens
│   │   ├── common/         # Confirm/View modals
│   │   ├── dashboard/      # Analytics dashboard charts
│   │   ├── documents/      # Purchase Order & Invoice designer
│   │   ├── items/          # Catalog lists, forms & style sheets
│   │   ├── layout/         # Header, sidebar navigation
│   │   ├── ledger/         # Stock transactions table
│   │   ├── reports/        # Analytical charts & excel download links
│   │   ├── settings/       # Custom settings page
│   │   ├── stockout/       # Dispatch stock manager
│   │   ├── suppliers/      # Supplier details panel
│   │   └── transfer/       # Warehouse transfer layout
│   ├── services/           # Mock API Data Services
│   │   ├── activityService.js  # Audit log recorder
│   │   ├── authService.js      # Password-hashed session controller
│   │   ├── imageService.js     # Image handling helper
│   │   ├── stockLogService.js  # Inventory level adjuster
│   │   └── transactionService.js # Ledger transaction compiler
│   ├── App.js              # Application Controller
│   ├── App.css             # Main Layout CSS rules
│   ├── index.js            # React Mount Script
│   └── index.css           # Global Theme CSS & styles
├── package.json            # NPM dependencies configuration
└── README.md               # Project Documentation
```

---

## 🚀 Setup & Installation

Follow these steps to run the project locally on your machine:

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18.x or above is recommended).

### 2. Install Dependencies
Clone or download the project folder, open the terminal in the `inventory-management` directory, and run:
```bash
npm install
```

### 3. Run Development Server
Start the local server by running:
```bash
npm start
```
The application will open automatically at [http://localhost:3000](http://localhost:3000).

### 4. Build for Production
To bundle the application into a compact, optimized production-ready bundle, run:
```bash
npm run build
```
This generates static files inside the `build/` directory ready for deployment.
