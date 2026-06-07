import React, { useState, useEffect, useRef, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { activityService } from "../../services/activityService";
import { transactionService } from "../../services/transactionService";
import "./Dashboard.css";

const Dashboard = ({ items, darkMode }) => {
  const [range, setRange] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("value");
  const [logs, setLogs] = useState([]);
  const [transactions, setTransactions] = useState([]);
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
    setTransactions(transactionService.getTransactions());
  }, []);

  const warehouses = useMemo(() => {
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

  const getSuggestedReorderDate = (daysLeft) => {
    if (daysLeft === Infinity || isNaN(daysLeft)) return "—";
    const reorderDate = new Date(now + daysLeft * 24 * 60 * 60 * 1000);
    return reorderDate.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // 🔹 FILTER DATA
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.createdDate) return false;

      const diffDays = (now - Number(item.createdDate)) / (1000 * 60 * 60 * 24);

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
  }, [items, range, warehouseFilter, now]);

  const lowStockItems = useMemo(() => {
    return filteredItems.filter(
      (item) => Number(item.quantity) <= (Number(item.minThreshold) || 5)
    );
  }, [filteredItems]);

  // 🔹 KPI
  const totalItems = filteredItems.length;
  const activeItems = filteredItems.filter(i => i.status === "1").length;
  const inactiveItems = filteredItems.filter(i => i.status === "0").length;

  const totalValue = useMemo(() => {
    return filteredItems.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0
    );
  }, [filteredItems]);

  // 🔹 Monthly grouping
  const monthlyData = useMemo(() => {
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
    return {
      labels: Object.keys(monthlyGrouped),
      values: Object.values(monthlyGrouped),
    };
  }, [filteredItems]);

  // 🔹 Category grouping (item counts)
  const categoryData = useMemo(() => {
    const categoryGrouped = {};
    filteredItems.forEach((item) => {
      if (!item.category) return;
      categoryGrouped[item.category] = (categoryGrouped[item.category] || 0) + 1;
    });
    return Object.keys(categoryGrouped).map((cat) => ({
      name: cat,
      y: categoryGrouped[cat],
    }));
  }, [filteredItems]);

  // 🔹 TOP 5 EXPENSIVE ITEMS
  const topExpensiveItems = useMemo(() => {
    return [...filteredItems]
      .sort((a, b) => Number(b.price) - Number(a.price))
      .slice(0, 5);
  }, [filteredItems]);

  // 🔹 SUPPLIER STATISTICS GROUP
  const supplierStats = useMemo(() => {
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
    statsArray.forEach((stat) => {
      stat.share = grandTotalValuation > 0 ? (stat.valuation / grandTotalValuation) * 100 : 0;
    });
    return statsArray.sort((a, b) => b.valuation - a.valuation);
  }, [filteredItems]);

  // 🔹 DAILY VALUE GROUP
  const dailyValueData = useMemo(() => {
    const dailyValueMap = {};
    filteredItems.forEach((item) => {
      const dateKey = new Date(Number(item.createdDate))
        .toISOString()
        .split("T")[0];
      const itemValue = (Number(item.price) || 0) * (Number(item.quantity) || 0);
      dailyValueMap[dateKey] = (dailyValueMap[dateKey] || 0) + itemValue;
    });

    const labels = Object.keys(dailyValueMap).sort();
    const values = labels.map((date) => dailyValueMap[date]);
    return { labels, values };
  }, [filteredItems]);

  // 🔹 MONTHLY VALUE GROUP
  const monthlyValueData = useMemo(() => {
    const monthlyValueMap = {};
    filteredItems.forEach((item) => {
      const d = new Date(Number(item.createdDate));
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const itemValue = (Number(item.price) || 0) * (Number(item.quantity) || 0);
      monthlyValueMap[monthKey] = (monthlyValueMap[monthKey] || 0) + itemValue;
    });

    const labels = Object.keys(monthlyValueMap).sort();
    const values = labels.map((m) => monthlyValueMap[m]);
    return { labels, values };
  }, [filteredItems]);

  const [valueView, setValueView] = useState("daily");

  // 🔹 Stock Growth logic
  const [activeChart, setActiveChart] = useState("daily");

  const trendData = useMemo(() => {
    const groupedData = {};
    filteredItems.forEach((item) => {
      const dateKey = new Date(Number(item.createdDate))
        .toISOString()
        .split("T")[0];
      groupedData[dateKey] = (groupedData[dateKey] || 0) + 1;
    });

    const labels = Object.keys(groupedData).sort();
    const dailyValues = labels.map((date) => groupedData[date]);

    let cumulativeSum = 0;
    const growthValues = labels.map((date) => {
      cumulativeSum += groupedData[date];
      return cumulativeSum;
    });

    return { labels, dailyValues, growthValues };
  }, [filteredItems]);

  // 🔹 WAREHOUSE VALUATION
  const warehouseData = useMemo(() => {
    const valuations = {};
    filteredItems.forEach((item) => {
      const warehouseName = (item.warehouse || "Unassigned").trim();
      const itemValue = (Number(item.price) || 0) * (Number(item.quantity) || 0);
      valuations[warehouseName] = (valuations[warehouseName] || 0) + itemValue;
    });
    return {
      labels: Object.keys(valuations),
      values: Object.values(valuations),
    };
  }, [filteredItems]);

  // 🔹 STOCK FLOW IN/OUT ANALYSIS
  const stockFlowData = useMemo(() => {
    const flowMap = {}; // { 'YYYY-MM-DD': { in: 0, out: 0 } }

    transactions.forEach((tx) => {
      if (!tx.timestamp) return;
      const diffDays = (now - Number(tx.timestamp)) / (1000 * 60 * 60 * 24);

      if (range !== "all") {
        if (range === "7" && diffDays > 7) return;
        if (range === "15" && diffDays > 15) return;
        if (range === "30" && diffDays > 30) return;
      }

      const dateKey = new Date(Number(tx.timestamp)).toISOString().split("T")[0];
      if (!flowMap[dateKey]) {
        flowMap[dateKey] = { in: 0, out: 0 };
      }

      if (tx.type === "IN") {
        flowMap[dateKey].in += Number(tx.qty) || 0;
      } else if (tx.type === "OUT") {
        flowMap[dateKey].out += Number(tx.qty) || 0;
      }
    });

    const dates = Object.keys(flowMap).sort();
    const inValues = dates.map(d => flowMap[d].in);
    const outValues = dates.map(d => flowMap[d].out);

    return { dates, inValues, outValues };
  }, [transactions, range, now]);

  // 🔹 STOCK HEALTH CATEGORIZATION
  const stockHealthData = useMemo(() => {
    let healthy = 0;
    let lowStock = 0;
    let outOfStock = 0;

    filteredItems.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const threshold = Number(item.minThreshold) || 5;

      if (qty === 0) {
        outOfStock++;
      } else if (qty <= threshold) {
        lowStock++;
      } else {
        healthy++;
      }
    });

    return [
      { name: "Healthy", y: healthy, color: "#22c55e" },
      { name: "Low Stock", y: lowStock, color: "#f59e0b" },
      { name: "Out of Stock", y: outOfStock, color: "#ef4444" }
    ];
  }, [filteredItems]);

  // 🔹 CATEGORY VALUATION SHARE
  const categoryValuationData = useMemo(() => {
    const categoryValMap = {};
    filteredItems.forEach((item) => {
      if (!item.category) return;
      const itemValue = (Number(item.price) || 0) * (Number(item.quantity) || 0);
      categoryValMap[item.category] = (categoryValMap[item.category] || 0) + itemValue;
    });

    const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#10b981"];
    return Object.keys(categoryValMap).map((cat, idx) => ({
      name: cat,
      y: categoryValMap[cat],
      color: colors[idx % colors.length]
    }));
  }, [filteredItems]);

  // 🔹 RECENT TRANSACTIONS FEED
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  // 🔹 PREDICTIVE REORDER FORECAST
  const reorderForecast = useMemo(() => {
    const itemOutMap = {}; // { [itemCode]: { totalOut: 0, oldestTx: now } }

    transactions.forEach((tx) => {
      if (tx.type !== "OUT" || !tx.itemId) return;
      const code = tx.itemId;
      const qty = Number(tx.qty) || 0;
      const timestamp = Number(tx.timestamp) || now;

      if (!itemOutMap[code]) {
        itemOutMap[code] = { totalOut: 0, oldestTx: now };
      }

      itemOutMap[code].totalOut += qty;
      if (timestamp < itemOutMap[code].oldestTx) {
        itemOutMap[code].oldestTx = timestamp;
      }
    });

    return filteredItems.map((item) => {
      const code = item.code;
      const currentQty = Number(item.quantity) || 0;
      const minThreshold = Number(item.minThreshold) || 5;

      const outInfo = itemOutMap[code];
      let dailyDemand = 0;
      let daysLeft = Infinity;

      if (outInfo && outInfo.totalOut > 0) {
        const timeSpanDays = Math.max(1, (now - outInfo.oldestTx) / (1000 * 60 * 60 * 24));
        dailyDemand = outInfo.totalOut / timeSpanDays;
        if (dailyDemand > 0) {
          daysLeft = currentQty / dailyDemand;
        }
      }

      let status = "Healthy";
      let statusClass = "badge-add"; // Green

      if (currentQty === 0) {
        status = "Out of Stock";
        statusClass = "badge-delete"; // Red
      } else if (daysLeft < 3) {
        status = "Critical";
        statusClass = "badge-delete"; // Red
      } else if (daysLeft <= 10 || currentQty <= minThreshold) {
        status = "Warning";
        statusClass = "badge-update"; // Yellow/Orange
      }

      return {
        ...item,
        dailyDemand,
        daysLeft,
        statusLabel: status,
        statusClass
      };
    }).sort((a, b) => a.daysLeft - b.daysLeft); // Show critical/warning first
  }, [filteredItems, transactions, now]);

  // ── Highcharts Option Generators ──
  const labelColor = darkMode ? "#cbd5e1" : "#475569";
  const gridColor = darkMode ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9";
  const axisColor = darkMode ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1";
  const tooltipBg = darkMode ? "#1e293b" : "#ffffff";
  const tooltipBorder = darkMode ? "#334155" : "#e2e8f0";
  const tooltipText = darkMode ? "#cbd5e1" : "#0f172a";

  // Chart 1: Stock Valuation
  const valueChartOptions = useMemo(() => {
    const isDaily = valueView === "daily";
    const labels = isDaily ? dailyValueData.labels : monthlyValueData.labels;
    const values = isDaily ? dailyValueData.values : monthlyValueData.values;
    const barColor = isDaily ? "#6366f1" : "#22c55e";

    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 320,
        style: { fontFamily: "'Inter', sans-serif" }
      },
      title: { text: null },
      credits: { enabled: false },
      xAxis: {
        categories: labels,
        labels: { style: { color: labelColor, fontSize: "11px" } },
        lineColor: axisColor,
        tickColor: axisColor
      },
      yAxis: {
        title: { text: null },
        labels: {
          formatter: function () {
            return "₹" + this.value.toLocaleString();
          },
          style: { color: labelColor }
        },
        gridLineColor: gridColor
      },
      legend: { enabled: false },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        style: { color: tooltipText },
        shadow: true,
        formatter: function () {
          return `<b>${this.x}</b><br/>Valuation: <b>₹ ${this.y.toLocaleString()}</b>`;
        }
      },
      series: [
        {
          name: "Valuation",
          data: values,
          color: barColor,
          borderRadius: 4
        }
      ]
    };
  }, [valueView, dailyValueData, monthlyValueData, labelColor, gridColor, axisColor, tooltipBg, tooltipBorder, tooltipText]);

  // Chart 2: Stock Growth
  const growthChartOptions = useMemo(() => {
    const isDaily = activeChart === "daily";
    const values = isDaily ? trendData.dailyValues : trendData.growthValues;
    const themeColor = isDaily ? "#6366f1" : "#22c55e";
    const stopColor = isDaily ? "rgba(99, 102, 241, 0.2)" : "rgba(34, 197, 94, 0.2)";

    return {
      chart: {
        type: "areaspline",
        backgroundColor: "transparent",
        height: 320,
        style: { fontFamily: "'Inter', sans-serif" }
      },
      title: { text: null },
      credits: { enabled: false },
      xAxis: {
        categories: trendData.labels,
        labels: { style: { color: labelColor, fontSize: "11px" } },
        lineColor: axisColor,
        tickColor: axisColor
      },
      yAxis: {
        title: { text: null },
        labels: { style: { color: labelColor } },
        gridLineColor: gridColor
      },
      legend: { enabled: false },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        style: { color: tooltipText },
        shadow: true,
        formatter: function () {
          return `<b>${this.x}</b><br/>Items: <b>${this.y}</b>`;
        }
      },
      plotOptions: {
        areaspline: {
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, stopColor],
              [1, "rgba(255, 255, 255, 0)"]
            ]
          },
          lineWidth: 2,
          marker: {
            radius: 3,
            fillColor: themeColor
          }
        }
      },
      series: [
        {
          name: "Items",
          data: values,
          color: themeColor
        }
      ]
    };
  }, [activeChart, trendData, labelColor, gridColor, axisColor, tooltipBg, tooltipBorder, tooltipText]);

  // Chart 3: Warehouses
  const warehouseChartOptions = useMemo(() => {
    const colors = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6"];
    const seriesData = warehouseData.values.map((val, idx) => ({
      y: val,
      color: colors[idx % colors.length]
    }));

    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 320,
        style: { fontFamily: "'Inter', sans-serif" }
      },
      title: { text: null },
      credits: { enabled: false },
      xAxis: {
        categories: warehouseData.labels,
        labels: { style: { color: labelColor, fontSize: "11px" } },
        lineColor: axisColor,
        tickColor: axisColor
      },
      yAxis: {
        title: { text: null },
        labels: {
          formatter: function () {
            return "₹" + this.value.toLocaleString();
          },
          style: { color: labelColor }
        },
        gridLineColor: gridColor
      },
      legend: { enabled: false },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        style: { color: tooltipText },
        shadow: true,
        formatter: function () {
          return `<b>${this.x}</b><br/>Valuation: <b>₹ ${this.y.toLocaleString()}</b>`;
        }
      },
      series: [
        {
          name: "Warehouse Valuation",
          data: seriesData,
          borderRadius: 4
        }
      ]
    };
  }, [warehouseData, labelColor, gridColor, axisColor, tooltipBg, tooltipBorder, tooltipText]);

  // Chart 4: Additions (Monthly)
  const monthlyChartOptions = useMemo(() => {
    return {
      chart: {
        type: "column",
        backgroundColor: "transparent",
        height: 320,
        style: { fontFamily: "'Inter', sans-serif" }
      },
      title: { text: null },
      credits: { enabled: false },
      xAxis: {
        categories: monthlyData.labels,
        labels: { style: { color: labelColor, fontSize: "11px" } },
        lineColor: axisColor,
        tickColor: axisColor
      },
      yAxis: {
        title: { text: null },
        labels: { style: { color: labelColor } },
        gridLineColor: gridColor
      },
      legend: { enabled: false },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        style: { color: tooltipText },
        shadow: true,
        formatter: function () {
          return `<b>${this.x}</b><br/>Added: <b>${this.y} items</b>`;
        }
      },
      series: [
        {
          name: "Monthly Data",
          data: monthlyData.values,
          color: "#543be0",
          borderRadius: 4
        }
      ]
    };
  }, [monthlyData, labelColor, gridColor, axisColor, tooltipBg, tooltipBorder, tooltipText]);

  // Chart 5: Stock Flow (IN/OUT)
  const flowChartOptions = useMemo(() => {
    return {
      chart: {
        type: "areaspline",
        backgroundColor: "transparent",
        height: 320,
        style: { fontFamily: "'Inter', sans-serif" }
      },
      title: { text: null },
      credits: { enabled: false },
      xAxis: {
        categories: stockFlowData.dates,
        labels: { style: { color: labelColor, fontSize: "11px" } },
        lineColor: axisColor,
        tickColor: axisColor
      },
      yAxis: {
        title: { text: null },
        labels: { style: { color: labelColor } },
        gridLineColor: gridColor
      },
      legend: {
        itemStyle: { color: labelColor, fontSize: "11px" },
        itemHoverStyle: { color: darkMode ? "#f8fafc" : "#0f172a" },
        align: "center",
        verticalAlign: "bottom",
        layout: "horizontal"
      },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        style: { color: tooltipText },
        shared: true,
        shadow: true,
        formatter: function () {
          let s = `<b>${this.x}</b>`;
          this.points.forEach(function (point) {
            s += `<br/>${point.series.name}: <b>${point.y} units</b>`;
          });
          return s;
        }
      },
      plotOptions: {
        areaspline: {
          fillOpacity: 0.1,
          lineWidth: 2,
          marker: { radius: 3 }
        }
      },
      series: [
        {
          name: "Stock Inflow (IN)",
          data: stockFlowData.inValues,
          color: "#22c55e",
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, "rgba(34, 197, 94, 0.2)"],
              [1, "rgba(34, 197, 94, 0)"]
            ]
          }
        },
        {
          name: "Stock Dispatch (OUT)",
          data: stockFlowData.outValues,
          color: "#ef4444",
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, "rgba(239, 68, 68, 0.2)"],
              [1, "rgba(239, 68, 68, 0)"]
            ]
          }
        }
      ]
    };
  }, [stockFlowData, darkMode, labelColor, gridColor, axisColor, tooltipBg, tooltipBorder, tooltipText]);

  // Chart 6: Status Breakdown (Donut)
  const statusPieOptions = useMemo(() => {
    return {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        height: 250,
        style: { fontFamily: "'Inter', sans-serif" }
      },
      title: { text: null },
      credits: { enabled: false },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        style: { color: tooltipText },
        pointFormat: "<b>{point.y}</b> items ({point.percentage:.1f}%)"
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: { enabled: false },
          showInLegend: true,
          colors: ["#22c55e", "#ef4444"]
        }
      },
      legend: {
        itemStyle: { color: darkMode ? "#cbd5e1" : "#475569", fontSize: "11px" },
        itemHoverStyle: { color: darkMode ? "#f8fafc" : "#0f172a" },
        align: "center",
        verticalAlign: "bottom",
        layout: "horizontal"
      },
      series: [
        {
          name: "Status",
          innerSize: "50%",
          data: [
            { name: "Active", y: activeItems },
            { name: "Inactive", y: inactiveItems }
          ]
        }
      ]
    };
  }, [activeItems, inactiveItems, darkMode, tooltipBg, tooltipBorder, tooltipText]);

  // Chart 7: Category Breakdown (Donut)
  const categoryPieOptions = useMemo(() => {
    const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#10b981"];
    const seriesData = categoryData.map((point, idx) => ({
      ...point,
      color: colors[idx % colors.length]
    }));

    return {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        height: 250,
        style: { fontFamily: "'Inter', sans-serif" }
      },
      title: { text: null },
      credits: { enabled: false },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        style: { color: tooltipText },
        pointFormat: "<b>{point.y}</b> items ({point.percentage:.1f}%)"
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: { enabled: false },
          showInLegend: true
        }
      },
      legend: {
        itemStyle: { color: darkMode ? "#cbd5e1" : "#475569", fontSize: "11px" },
        itemHoverStyle: { color: darkMode ? "#f8fafc" : "#0f172a" },
        align: "center",
        verticalAlign: "bottom",
        layout: "horizontal"
      },
      series: [
        {
          name: "Category",
          innerSize: "50%",
          data: seriesData
        }
      ]
    };
  }, [categoryData, darkMode, tooltipBg, tooltipBorder, tooltipText]);

  // Chart 8: Stock Health Breakdown (Donut)
  const stockHealthOptions = useMemo(() => {
    return {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        height: 250,
        style: { fontFamily: "'Inter', sans-serif" }
      },
      title: { text: null },
      credits: { enabled: false },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        style: { color: tooltipText },
        pointFormat: "<b>{point.y}</b> items ({point.percentage:.1f}%)"
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: { enabled: false },
          showInLegend: true
        }
      },
      legend: {
        itemStyle: { color: darkMode ? "#cbd5e1" : "#475569", fontSize: "11px" },
        itemHoverStyle: { color: darkMode ? "#f8fafc" : "#0f172a" },
        align: "center",
        verticalAlign: "bottom",
        layout: "horizontal"
      },
      series: [
        {
          name: "Stock Health",
          innerSize: "50%",
          data: stockHealthData
        }
      ]
    };
  }, [stockHealthData, darkMode, tooltipBg, tooltipBorder, tooltipText]);

  // Chart 9: Category Valuation Breakdown (Donut)
  const categoryValuationOptions = useMemo(() => {
    return {
      chart: {
        type: "pie",
        backgroundColor: "transparent",
        height: 250,
        style: { fontFamily: "'Inter', sans-serif" }
      },
      title: { text: null },
      credits: { enabled: false },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        style: { color: tooltipText },
        formatter: function () {
          return `<b>${this.key}</b><br/>Value: <b>₹ ${this.y.toLocaleString()}</b> (${this.percentage.toFixed(1)}%)`;
        }
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: "pointer",
          dataLabels: { enabled: false },
          showInLegend: true
        }
      },
      legend: {
        itemStyle: { color: darkMode ? "#cbd5e1" : "#475569", fontSize: "11px" },
        itemHoverStyle: { color: darkMode ? "#f8fafc" : "#0f172a" },
        align: "center",
        verticalAlign: "bottom",
        layout: "horizontal"
      },
      series: [
        {
          name: "Category Valuation",
          innerSize: "50%",
          data: categoryValuationData
        }
      ]
    };
  }, [categoryValuationData, darkMode, tooltipBg, tooltipBorder, tooltipText]);

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
                  className={`chart-tab-btn ${activeTab === "flow" ? "active" : ""}`}
                  onClick={() => setActiveTab("flow")}
                >
                  <i className="bi bi-arrow-left-right me-1"></i> Stock Flow (IN/OUT)
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
                <HighchartsReact highcharts={Highcharts} options={valueChartOptions} />
              </div>
              <div className={activeTab === "flow" ? "chart-visible" : "chart-hidden"}>
                <HighchartsReact highcharts={Highcharts} options={flowChartOptions} />
              </div>
              <div className={activeTab === "trend" ? "chart-visible" : "chart-hidden"}>
                <HighchartsReact highcharts={Highcharts} options={growthChartOptions} />
              </div>
              <div className={activeTab === "warehouse" ? "chart-visible" : "chart-hidden"}>
                <HighchartsReact highcharts={Highcharts} options={warehouseChartOptions} />
              </div>
              <div className={activeTab === "monthly" ? "chart-visible" : "chart-hidden"}>
                <HighchartsReact highcharts={Highcharts} options={monthlyChartOptions} />
              </div>
            </div>
          </div>

          {/* CLASSIFICATIONS & CATEGORIES */}
          <div className="distributions-card card-box mt-4">
            <div className="card-header">
              <h3>
                <i className="bi bi-pie-chart text-info me-2"></i>
                Inventory Classifications & Analytics
              </h3>
            </div>
            <div className="distributions-grid">
              <div className="dist-section">
                <h5>Stock Health Breakdown</h5>
                <div className="pie-chart-wrapper">
                  <HighchartsReact highcharts={Highcharts} options={stockHealthOptions} />
                </div>
              </div>
              <div className="dist-section">
                <h5>Category Distribution (Count)</h5>
                <div className="pie-chart-wrapper">
                  <HighchartsReact highcharts={Highcharts} options={categoryPieOptions} />
                </div>
              </div>
              <div className="dist-section">
                <h5>Category Valuation Share (₹)</h5>
                <div className="pie-chart-wrapper">
                  <HighchartsReact highcharts={Highcharts} options={categoryValuationOptions} />
                </div>
              </div>
              <div className="dist-section">
                <h5>Item Status Ratio</h5>
                <div className="pie-chart-wrapper">
                  <HighchartsReact highcharts={Highcharts} options={statusPieOptions} />
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

          {/* PREDICTIVE REORDER FORECAST */}
          <div className="suppliers-card card-box mt-4">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h3>
                <i className="bi bi-clock-fill text-primary me-2"></i>
                Predictive Reorder Forecast
              </h3>
              <span className="status-ratio-badge">
                Based on historic outbound demand rates
              </span>
            </div>

            <div className="table-responsive">
              {reorderForecast.length === 0 ? (
                <p className="text-muted text-center py-3">No inventory items found to forecast</p>
              ) : (
                <table className="table-supplier-analytics">
                  <thead>
                    <tr>
                      <th>Item Details</th>
                      <th>Warehouse</th>
                      <th>Current Stock</th>
                      <th>Outflow Rate</th>
                      <th>Est. Days Left</th>
                      <th>Suggested Reorder Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reorderForecast.map((item) => {
                      const daysDisplay = item.daysLeft === Infinity
                        ? "—"
                        : item.daysLeft <= 0
                          ? "Immediate"
                          : `${Math.ceil(item.daysLeft)} days`;
                      const reorderDateDisplay = item.daysLeft === Infinity
                        ? "—"
                        : item.daysLeft <= 0
                          ? "Immediate"
                          : getSuggestedReorderDate(item.daysLeft);

                      let daysStyle = {};
                      if (item.daysLeft < 3) {
                        daysStyle = { color: "#ef4444", fontWeight: "700" };
                      } else if (item.daysLeft <= 10) {
                        daysStyle = { color: "#f59e0b", fontWeight: "600" };
                      } else {
                        daysStyle = { color: "#22c55e", fontWeight: "600" };
                      }

                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="d-flex flex-column">
                              <span className="supplier-name-col" style={{ fontWeight: "600" }}>{item.name}</span>
                              <span className="text-muted" style={{ fontSize: "11px" }}>{item.code}</span>
                            </div>
                          </td>
                          <td>{item.warehouse || "Unassigned"}</td>
                          <td><strong>{item.quantity}</strong> units</td>
                          <td>{item.dailyDemand.toFixed(2)} / day</td>
                          <td style={daysStyle}>{daysDisplay}</td>
                          <td>{reorderDateDisplay}</td>
                          <td>
                            <span className={`action-tag ${item.statusClass}`}>
                              {item.statusLabel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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

          {/* RECENT TRANSACTIONS LEDGER TIMELINE */}
          <div className="activity-timeline-card card-box mb-4 animate-fade-in">
            <div className="timeline-card-header">
              <h3>
                <i className="bi bi-arrow-left-right text-success me-2"></i>
                Recent Stock Flow
              </h3>
            </div>
            <div className="timeline-card-body">
              {recentTransactions.length === 0 ? (
                <div className="timeline-empty">
                  No transactions recorded yet.
                </div>
              ) : (
                <div className="timeline-items sidebar-timeline">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="timeline-item">
                      <div className={`timeline-badge ${tx.type === "IN" ? "add_item" : "delete_item"}`} title={tx.type === "IN" ? "Inflow" : "Outflow"}>
                        <i className={`bi ${tx.type === "IN" ? "bi-arrow-down-left" : "bi-arrow-up-right"}`}></i>
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <div className="timeline-meta">
                            <span className="flow-item-name" style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {tx.itemName}
                            </span>
                            <span className={`action-tag ${tx.type === "IN" ? "badge-add" : "badge-delete"}`}>
                              {tx.type === "IN" ? `+${tx.qty}` : `-${tx.qty}`}
                            </span>
                          </div>
                          <span className="log-time">
                            {formatTimestamp(tx.timestamp).split(',')[1] || formatTimestamp(tx.timestamp)}
                          </span>
                        </div>
                        <p className="log-desc" style={{ margin: "2px 0 0 0" }}>
                          {tx.reason} — By {tx.user}
                        </p>
                        {tx.notes && (
                          <p className="flow-item-notes">
                            "{tx.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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