import React, { useState } from "react";
import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { activityService } from "../../services/activityService";
import "./Dashboard.css";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

const Dashboard = ({ items }) => {
  const [range, setRange] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("value");
  const [logs, setLogs] = useState([]);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const warehouseRef = useRef(null);
  const rangeRef = useRef(null);
  const now = Date.now();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (warehouseRef.current && !warehouseRef.current.contains(event.target)) {
        setShowWarehouseDropdown(false);
      }
      if (rangeRef.current && !rangeRef.current.contains(event.target)) {
        setShowRangeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setLogs(activityService.getLogs());
  }, []);

  const warehouses = React.useMemo(() => {
    const unique = new Set();
    items.forEach((item) => {
      if (item.warehouse) {
        const w = item.warehouse.trim();
        if (w) unique.add(w);
      }
    });
    return [...unique].sort();
  }, [items]);

  const handleClearLogs = () => {
    if (window.confirm("Are you sure you want to clear all activity logs? This cannot be undone.")) {
      activityService.clearLogs();
      setLogs([]);
    }
  };

  const getIconForAction = (actionType) => {
    switch (actionType) {
      case "login": return "bi-box-arrow-in-right";
      case "logout": return "bi-box-arrow-right";
      case "signup": return "bi-person-plus-fill";
      case "add_item": return "bi-plus-circle-fill";
      case "update_item": return "bi-pencil-square";
      case "delete_item": return "bi-trash-fill";
      default: return "bi-info-circle-fill";
    }
  };

  const getActionBadge = (actionType) => {
    switch (actionType) {
      case "login": return { label: "Login", class: "badge-login" };
      case "logout": return { label: "Logout", class: "badge-logout" };
      case "signup": return { label: "Sign Up", class: "badge-signup" };
      case "add_item": return { label: "Add Item", class: "badge-add" };
      case "update_item": return { label: "Update", class: "badge-update" };
      case "delete_item": return { label: "Delete", class: "badge-delete" };
      default: return { label: "System", class: "badge-system" };
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  // 🔹 FILTER DATA
  const filteredItems = items.filter((item) => {
    if (!item.createdDate) return false;

    const diffDays =
      (now - Number(item.createdDate)) / (1000 * 60 * 60 * 24);

    const matchesRange =
      range === "all" ? true :
      range === "7" ? diffDays <= 7 :
      range === "15" ? diffDays <= 15 :
      range === "30" ? diffDays <= 30 : true;

    const matchesWarehouse =
      warehouseFilter === "all" ? true :
      (item.warehouse || "").trim() === warehouseFilter;

    return matchesRange && matchesWarehouse;
  });

  const lowStockItems = filteredItems.filter(
    (item) => Number(item.quantity) <= (Number(item.minThreshold) || 5)
  );

  // 🔹 KPI
  const totalItems = filteredItems.length;
  const activeItems = filteredItems.filter(i => i.status === "1").length;
  const inactiveItems = filteredItems.filter(i => i.status === "0").length;

  const totalValue = filteredItems.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );

  // 🔹 GROUP DATA (Trend)
  // const grouped = {};
  // filteredItems.forEach((item) => {
  //   const date = new Date(Number(item.createdDate)).toLocaleDateString("en-GB");
  //   grouped[date] = (grouped[date] || 0) + 1;
  // });

  // const lineData = {
  //   labels: Object.keys(grouped),
  //   datasets: [
  //     {
  //       label: "Items Added",
  //       data: Object.values(grouped),
  //       borderColor: "#6366f1",
  //       backgroundColor: "rgba(99,102,241,0.2)",
  //       fill: true,
  //       tension: 0.5,
  //       pointRadius: 4,
  //     },
  //   ],
  // };

  const grouped = {};
  filteredItems.forEach((item) => {
    const date = new Date(Number(item.createdDate))
      .toISOString()
      .split("T")[0]; // YYYY-MM-DD

    grouped[date] = (grouped[date] || 0) + 1;
  });

  // SORT IMPORTANT
  const sortedDates = Object.keys(grouped).sort();
  let runningTotal = 0;
  const cumulativeData = sortedDates.map((date) => {
    runningTotal += grouped[date];
    return runningTotal;
  });

  const lineData = {
    labels: sortedDates,
    datasets: [
      {
        label: "Items Added",
        data: cumulativeData,
        // data: sortedDates.map((date) => grouped[date]),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.2)",
        fill: true,
        tension: 0.5,
        pointRadius: 4,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
  };

  const pieData = {
    labels: ["Active", "Inactive"],
    datasets: [
      {
        data: [activeItems, inactiveItems],
        backgroundColor: ["#22c55e", "#ef4444"],
        hoverOffset: 10,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 10,
          font: {
            size: 11,
          },
        },
      },
    },
  };


  // 🔹 Monthly grouping
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const monthlyGrouped = {};
  filteredItems.forEach((item) => {
    if (!item.createdDate) return;

    const date = new Date(Number(item.createdDate));

    const month = date.toLocaleString("default", {
      month: "short",
      year: "numeric",
    });

    monthlyGrouped[month] = (monthlyGrouped[month] || 0) + 1;
  });

  const monthlyLabels = Object.keys(monthlyGrouped);
  const monthlyValues = Object.values(monthlyGrouped);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: monthlyLabels,
        datasets: [
          {
            label: "Monthly Data",
            data: monthlyValues,
            backgroundColor: "#543be0",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

  }, [filteredItems]);


  // 🔹 Category grouping
  const pieRef = useRef(null);
  const pieInstance = useRef(null);

  const categoryGrouped = {};

  filteredItems.forEach((item) => {
    if (!item.category) return;

    categoryGrouped[item.category] =
      (categoryGrouped[item.category] || 0) + 1;
  });

  const categoryLabels = Object.keys(categoryGrouped);
  const categoryValues = Object.values(categoryGrouped);

  useEffect(() => {
    if (!pieRef.current) return;

    if (pieInstance.current) {
      pieInstance.current.destroy();
    }

    const ctx = pieRef.current.getContext("2d");

    pieInstance.current = new Chart(ctx, {
      type: "pie",
      data: {
        labels: categoryLabels,
        datasets: [
          {
            data: categoryValues,
            backgroundColor: [
              "#6366f1",
              "#22c55e",
              "#f59e0b",
              "#ef4444",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 12,
              font: {
                size: 11,
              },
            },
          },
        },
      },
    });

  }, [filteredItems]);


  // 🔹 TOP 5 EXPENSIVE ITEMS
  const topExpensiveItems = [...filteredItems]
    .sort((a, b) => Number(b.price) - Number(a.price)) // high → low
    .slice(0, 5); // top 5


  // 🔹 SUPPLIER STATISTICS GROUP
  const supplierStats = React.useMemo(() => {
    const statsMap = {};
    let grandTotalValuation = 0;

    filteredItems.forEach((item) => {
      const supplier = (item.supplier || "Unknown Supplier").trim();
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const val = qty * price;
      grandTotalValuation += val;

      if (!statsMap[supplier]) {
        statsMap[supplier] = {
          name: supplier,
          count: 0,
          valuation: 0,
          active: 0,
          inactive: 0,
        };
      }

      statsMap[supplier].count += 1;
      statsMap[supplier].valuation += val;
      if (item.status === "1") {
        statsMap[supplier].active += 1;
      } else {
        statsMap[supplier].inactive += 1;
      }
    });

    const statsArray = Object.values(statsMap);

    // Compute share percentages
    statsArray.forEach((stat) => {
      stat.share = grandTotalValuation > 0 ? (stat.valuation / grandTotalValuation) * 100 : 0;
    });

    // Sort by valuation descending
    return statsArray.sort((a, b) => b.valuation - a.valuation);
  }, [filteredItems]);


  // 🔹 DAILY VALUE GROUP
  const dailyValueMap = {};

  filteredItems.forEach((item) => {
    const dateKey = new Date(Number(item.createdDate))
      .toISOString()
      .split("T")[0];

    const itemValue =
      (Number(item.price) || 0) *
      (Number(item.quantity) || 0);

    dailyValueMap[dateKey] =
      (dailyValueMap[dateKey] || 0) + itemValue;
  });

  const dailyValueLabels = Object.keys(dailyValueMap).sort();
  const dailyValueData = dailyValueLabels.map(
    (date) => dailyValueMap[date]
  );


  // 🔹 MONTHLY VALUE GROUP
  const monthlyValueMap = {};
  filteredItems.forEach((item) => {
    const d = new Date(Number(item.createdDate));

    const monthKey = `${d.getFullYear()}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}`;

    const itemValue =
      (Number(item.price) || 0) *
      (Number(item.quantity) || 0);

    monthlyValueMap[monthKey] =
      (monthlyValueMap[monthKey] || 0) + itemValue;
  });

  const monthlyValueLabels = Object.keys(monthlyValueMap).sort();
  const monthlyValueData = monthlyValueLabels.map(
    (m) => monthlyValueMap[m]
  );


  const [valueView, setValueView] = useState("daily");
  const valueChartRef = useRef(null);
  const valueChartInstance = useRef(null);

  useEffect(() => {
    if (!valueChartRef.current) return;

    const labels =
      valueView === "daily"
        ? dailyValueLabels
        : monthlyValueLabels;

    const data =
      valueView === "daily"
        ? dailyValueData
        : monthlyValueData;

    // 🔹 Chart already exists → UPDATE
    if (valueChartInstance.current) {
      const chart = valueChartInstance.current;

      chart.data.labels = labels;
      chart.data.datasets[0].data = data;

      chart.data.datasets[0].backgroundColor =
        valueView === "daily" ? "#6366f1" : "#22c55e";

      chart.update(); // smooth transition

    } else {
      // 🔹 First time → CREATE
      const ctx = valueChartRef.current.getContext("2d");

      valueChartInstance.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Inventory Value (₹)",
              data,
              backgroundColor:
                valueView === "daily"
                  ? "#6366f1"
                  : "#22c55e",
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 800, // smooth feel
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    }

  }, [filteredItems, valueView]);


  const [activeChart, setActiveChart] = useState("daily");
  // 🔹 GROUP DATA
  const groupedData = {};
  filteredItems.forEach((item) => {
    const dateKey = new Date(Number(item.createdDate))
      .toISOString()
      .split("T")[0];

    groupedData[dateKey] = (groupedData[dateKey] || 0) + 1;
  });

  // 🔹 SORT
  const sortedDateKeys = Object.keys(groupedData).sort();
  // 🔹 DAILY DATA
  const dailyChartData = sortedDateKeys.map(
    (date) => groupedData[date]
  );

  // 🔹 CUMULATIVE DATA
  let cumulativeSum = 0;
  const growthChartData = sortedDateKeys.map((date) => {
    cumulativeSum += groupedData[date];
    return cumulativeSum;
  });

  const chart_Ref = useRef(null);
  const chart_Instance = useRef(null);

  useEffect(() => {
    if (!chart_Ref.current) return;

    const labels = sortedDateKeys;

    const data =
      activeChart === "daily"
        ? dailyChartData
        : growthChartData;

    const color =
      activeChart === "daily"
        ? "#6366f1"
        : "#22c55e";

    const bg =
      activeChart === "daily"
        ? "rgba(99,102,241,0.2)"
        : "rgba(34,197,94,0.2)";

    // 🔹 UPDATE
    if (chart_Instance.current) {
      const chart = chart_Instance.current;

      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.data.datasets[0].borderColor = color;
      chart.data.datasets[0].backgroundColor = bg;

      chart.update(); // smooth transition

    } else {
      // 🔹 CREATE
      const ctx = chart_Ref.current.getContext("2d");

      chart_Instance.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Items",
              data,
              borderColor: color,
              backgroundColor: bg,
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 800,
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    }

  }, [filteredItems, activeChart]);


  // 🔹 WAREHOUSE VALUATION CHART
  const warehouseChartRef = useRef(null);
  const warehouseChartInstance = useRef(null);

  // Compute valuation for each warehouse
  const warehouseValuations = React.useMemo(() => {
    const valuations = {};
    filteredItems.forEach((item) => {
      const warehouseName = (item.warehouse || "Unassigned").trim();
      const itemValue = (Number(item.price) || 0) * (Number(item.quantity) || 0);
      valuations[warehouseName] = (valuations[warehouseName] || 0) + itemValue;
    });
    return valuations;
  }, [filteredItems]);

  const warehouseLabels = Object.keys(warehouseValuations);
  const warehouseValues = Object.values(warehouseValuations);

  useEffect(() => {
    if (!warehouseChartRef.current) return;

    if (warehouseChartInstance.current) {
      warehouseChartInstance.current.destroy();
    }

    const ctx = warehouseChartRef.current.getContext("2d");

    warehouseChartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: warehouseLabels,
        datasets: [
          {
            label: "Valuation (₹)",
            data: warehouseValues,
            backgroundColor: [
              "#6366f1",
              "#10b981",
              "#f59e0b",
              "#ec4899",
              "#8b5cf6",
              "#3b82f6",
            ],
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `Valuation: ₹ ${context.raw.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "₹" + value.toLocaleString();
              }
            }
          }
        }
      },
    });

    return () => {
      if (warehouseChartInstance.current) {
        warehouseChartInstance.current.destroy();
        warehouseChartInstance.current = null;
      }
    };
  }, [warehouseLabels, warehouseValues]);


  return (
    <div className="dashboard animate-fade-in">

      {/* HEADER */}
      <div className="dashboard-top">
        <div>
          <h2 className="dashboard-title">
            <i className="bi bi-speedometer2 text-primary me-1"></i>
            Inventory Dashboard
          </h2>
          <p className="dashboard-subtitle">
            Real-time overview of inventory insights
          </p>
        </div>

        <div className="d-flex align-items-center gap-3 flex-wrap">
          {/* Warehouse Filter Custom Dropdown */}
          <div className="custom-dropdown-container" ref={warehouseRef}>
            <button
              className={`custom-dropdown-btn ${showWarehouseDropdown ? "active" : ""}`}
              onClick={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
            >
              <i className="bi bi-building me-2 text-primary"></i>
              <span>
                {warehouseFilter === "all" ? "All Warehouses" : warehouseFilter}
              </span>
              <i className={`bi bi-chevron-down ms-2 arrow-icon ${showWarehouseDropdown ? "rotate" : ""}`}></i>
            </button>
            
            {showWarehouseDropdown && (
              <div className="custom-dropdown-list animate-slide-up">
                <div
                  className={`custom-dropdown-item ${warehouseFilter === "all" ? "selected" : ""}`}
                  onClick={() => {
                    setWarehouseFilter("all");
                    setShowWarehouseDropdown(false);
                  }}
                >
                  All Warehouses
                </div>
                {warehouses.map((w) => (
                  <div
                    key={w}
                    className={`custom-dropdown-item ${warehouseFilter === w ? "selected" : ""}`}
                    onClick={() => {
                      setWarehouseFilter(w);
                      setShowWarehouseDropdown(false);
                    }}
                  >
                    {w}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time range Custom Dropdown */}
          <div className="custom-dropdown-container" ref={rangeRef}>
            <button
              className={`custom-dropdown-btn ${showRangeDropdown ? "active" : ""}`}
              onClick={() => setShowRangeDropdown(!showRangeDropdown)}
            >
              <i className="bi bi-calendar3 me-2 text-primary"></i>
              <span>
                {range === "all" ? "All Time" :
                 range === "7" ? "7 Days" :
                 range === "15" ? "15 Days" :
                 range === "30" ? "30 Days" : range}
              </span>
              <i className={`bi bi-chevron-down ms-2 arrow-icon ${showRangeDropdown ? "rotate" : ""}`}></i>
            </button>
            
            {showRangeDropdown && (
              <div className="custom-dropdown-list animate-slide-up">
                {[
                  { value: "all", label: "All Time" },
                  { value: "7", label: "7 Days" },
                  { value: "15", label: "15 Days" },
                  { value: "30", label: "30 Days" }
                ].map((option) => (
                  <div
                    key={option.value}
                    className={`custom-dropdown-item ${range === option.value ? "selected" : ""}`}
                    onClick={() => {
                      setRange(option.value);
                      setShowRangeDropdown(false);
                    }}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NEW SIDEBAR + MAIN GRID LAYOUT */}
      <div className="dashboard-grid">

        {/* MAIN COLUMN (LEFT) */}
        <div className="dashboard-main">
          
          {/* KPI CARDS */}
          <div className="kpi-grid">
            <div className="kpi-card items">
              <span className="fw-bold">
                <i className="bi bi-box-seam text-primary me-1"></i>
                Total Items
              </span>
              <h3>{totalItems}</h3>
            </div>

            <div className="kpi-card active">
              <span className="fw-bold">
                <i className="bi bi-check-circle-fill text-success me-1"></i>
                Active
              </span>
              <h3>{activeItems}</h3>
            </div>

            <div className="kpi-card inactive">
              <span className="fw-bold">
                <i className="bi bi-x-circle-fill text-danger me-1"></i>
                Inactive
              </span>
              <h3>{inactiveItems}</h3>
            </div>

            <div className="kpi-card value">
              <span className="fw-bold">
                <i className="bi bi-currency-rupee text-info me-1"></i>
                Total Value
              </span>
              <h3>₹ {totalValue.toLocaleString()}</h3>
            </div>
          </div>

          {/* TABBED MAIN CHART CARD */}
          <div className="main-chart-card card-box mt-4">
            <div className="card-header flex-column flex-md-row gap-3">
              <div className="chart-tabs-wrapper">
                <button
                  className={`chart-tab-btn ${activeTab === "value" ? "active" : ""}`}
                  onClick={() => setActiveTab("value")}
                >
                  <i className="bi bi-currency-rupee me-1"></i> Stock Valuation
                </button>
                <button
                  className={`chart-tab-btn ${activeTab === "trend" ? "active" : ""}`}
                  onClick={() => setActiveTab("trend")}
                >
                  <i className="bi bi-graph-up me-1"></i> Stock Growth
                </button>
                <button
                  className={`chart-tab-btn ${activeTab === "warehouse" ? "active" : ""}`}
                  onClick={() => setActiveTab("warehouse")}
                >
                  <i className="bi bi-building me-1"></i> Warehouses
                </button>
                <button
                  className={`chart-tab-btn ${activeTab === "monthly" ? "active" : ""}`}
                  onClick={() => setActiveTab("monthly")}
                >
                  <i className="bi bi-calendar3 me-1"></i> Additions (Monthly)
                </button>
              </div>

              {/* Dynamic Chart Sub-Controls */}
              {activeTab === "value" && (
                <div className="toggle-wrapper">
                  <div className={`toggle-slider ${valueView === "daily" ? "left" : "right"}`}></div>
                  <button className="fw-semibold" onClick={() => setValueView("daily")}>Daily</button>
                  <button className="fw-semibold" onClick={() => setValueView("monthly")}>Monthly</button>
                </div>
              )}
              {activeTab === "trend" && (
                <div className="toggle-wrapper">
                  <div className={`toggle-slider ${activeChart === "daily" ? "left" : "right"}`}></div>
                  <button className="fw-semibold" onClick={() => setActiveChart("daily")}>Daily</button>
                  <button className="fw-semibold" onClick={() => setActiveChart("growth")}>Growth</button>
                </div>
              )}
            </div>

            <div className="chart-container">
              <div className={activeTab === "value" ? "chart-visible" : "chart-hidden"}>
                <canvas ref={valueChartRef}></canvas>
              </div>
              <div className={activeTab === "trend" ? "chart-visible" : "chart-hidden"}>
                <canvas ref={chart_Ref}></canvas>
              </div>
              <div className={activeTab === "warehouse" ? "chart-visible" : "chart-hidden"}>
                <canvas ref={warehouseChartRef}></canvas>
              </div>
              <div className={activeTab === "monthly" ? "chart-visible" : "chart-hidden"}>
                <canvas ref={chartRef}></canvas>
              </div>
            </div>
          </div>

          {/* CLASSIFICATIONS & CATEGORIES */}
          <div className="distributions-card card-box mt-4">
            <div className="card-header">
              <h3>
                <i className="bi bi-pie-chart text-info me-2"></i>
                Inventory Classifications & Categories
              </h3>
            </div>
            <div className="distributions-grid">
              <div className="dist-section">
                <h5>Status Breakdown</h5>
                <div className="pie-chart-wrapper">
                  <Pie data={pieData} options={pieOptions} />
                </div>
              </div>
              <div className="dist-section">
                <h5>Category Breakdown</h5>
                <div className="pie-chart-wrapper">
                  <canvas ref={pieRef}></canvas>
                </div>
              </div>
            </div>
          </div>

          {/* SUPPLIER PERFORMANCE & ANALYTICS */}
          <div className="suppliers-card card-box mt-4">
            <div className="card-header">
              <h3>
                <i className="bi bi-person-lines-fill text-warning me-2"></i>
                Supplier Performance & Analytics
              </h3>
            </div>
            
            <div className="table-responsive">
              {supplierStats.length === 0 ? (
                <p className="text-muted text-center py-3">No supplier data available</p>
              ) : (
                <table className="table-supplier-analytics">
                  <thead>
                    <tr>
                      <th>Supplier Name</th>
                      <th>Items Supplied</th>
                      <th>Stock Valuation</th>
                      <th>Valuation Share</th>
                      <th>Active Status Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierStats.map((stat) => (
                      <tr key={stat.name}>
                        <td className="supplier-name-col">
                          <strong>{stat.name}</strong>
                        </td>
                        <td>{stat.count} items</td>
                        <td className="valuation-col">
                          ₹ {stat.valuation.toLocaleString()}
                        </td>
                        <td>
                          <div className="share-progress-container">
                            <div
                              className="share-progress-bar"
                              style={{ width: `${stat.share}%` }}
                            ></div>
                            <span className="share-text">
                              {stat.share.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="status-ratio-badge">
                            {stat.active} Active / {stat.inactive} Inactive
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* SIDEBAR COLUMN (RIGHT) */}
        <div className="dashboard-sidebar">

          {/* LOW STOCK ALERTS WIDGET */}
          {lowStockItems.length > 0 && (
            <div className="low-stock-alert-widget animate-fade-in mb-4">
              <div className="alert-widget-header">
                <i className="bi bi-exclamation-octagon-fill text-danger me-2"></i>
                <h4 className="m-0 text-danger fw-bold">Low Stock Warning ({lowStockItems.length})</h4>
              </div>
              <div className="alert-widget-body">
                <p className="alert-widget-desc">
                  Replenish safety stock levels immediately.
                </p>
                <div className="alert-items-list-wrapper">
                  {lowStockItems.map(item => (
                    <div key={item.id} className="alert-item-pill">
                      <span className="item-name-text">{item.name}</span>
                      <span className="item-qty-badge">
                        {item.quantity} left
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TOP 5 EXPENSIVE ITEMS */}
          <div className="top-items-card card-box">
            <h3>
              <i className="bi bi-star-fill text-warning me-2"></i>
              Top 5 Expensive Items
            </h3>

            <div className="top-items-list">
              {topExpensiveItems.length === 0 && (
                <p className="text-muted text-center py-3">No data available</p>
              )}

              {topExpensiveItems.map((item, index) => (
                <div key={item.id} className="top-item">
                  <div className="item-rank">
                    #{index + 1}
                  </div>

                  <div className="item-details">
                    <div className="item-name">{item.name}</div>
                    <div className="item-supplier">
                      {item.supplier || "No Supplier"}
                    </div>
                  </div>

                  <div className="item-price">
                    ₹{Number(item.price).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SYSTEM ACTIVITY LOGS TIMELINE */}
          <div className="activity-timeline-card card-box mt-4 animate-fade-in">
            <div className="timeline-card-header">
              <h3>
                <i className="bi bi-clock-history text-primary me-2"></i>
                Activity Logs
              </h3>
              {logs.length > 0 && (
                <button className="clear-logs-btn" onClick={handleClearLogs}>
                  Clear
                </button>
              )}
            </div>
            <div className="timeline-card-body">
              {logs.length === 0 ? (
                <div className="timeline-empty">
                  No activities logged yet.
                </div>
              ) : (
                <div className="timeline-items sidebar-timeline">
                  {logs.map((log) => {
                    const badgeInfo = getActionBadge(log.actionType);
                    return (
                      <div key={log.id} className="timeline-item">
                        <div className={`timeline-badge ${log.actionType}`} title={badgeInfo.label}>
                          <i className={`bi ${getIconForAction(log.actionType)}`}></i>
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <div className="timeline-meta">
                              <span className="log-user">
                                {log.userName}
                              </span>
                              <span className={`action-tag ${badgeInfo.class}`}>
                                {badgeInfo.label}
                              </span>
                            </div>
                            <span className="log-time">
                              {formatTimestamp(log.timestamp).split(',')[1] || formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                          <p className="log-desc">{log.details}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;