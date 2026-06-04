import React, { useState } from "react";
import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
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

  const now = Date.now();

  // 🔹 FILTER DATA
  const filteredItems = items.filter((item) => {
    if (!item.createdDate) return false;

    const diffDays =
      (now - Number(item.createdDate)) / (1000 * 60 * 60 * 24);

    if (range === "7") return diffDays <= 7;
    if (range === "30") return diffDays <= 30;

    return true;
  });

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
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };


  // 🔹 Monthly grouping
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const monthlyGrouped = {};
  items.forEach((item) => {
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
    });

  }, [items]);


  // 🔹 Category grouping
  const pieRef = useRef(null);
  const pieInstance = useRef(null);

  const categoryGrouped = {};

  items.forEach((item) => {
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
    });

  }, [items]);


  // 🔹 TOP 5 EXPENSIVE ITEMS
  const topExpensiveItems = [...items]
    .sort((a, b) => Number(b.price) - Number(a.price)) // high → low
    .slice(0, 5); // top 5


  // 🔹 DAILY VALUE GROUP
  const dailyValueMap = {};

  items.forEach((item) => {
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
  items.forEach((item) => {
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
          animation: {
            duration: 800, // smooth feel
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    }

  }, [items, valueView]);


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
          animation: {
            duration: 800,
          },
        },
      });
    }

  }, [items, activeChart]);


  return (
    <div className="dashboard">

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

        <div className="filter-pill">
          <i className="bi bi-calendar3"></i>

          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="7">7 Days</option>
            <option value="15">15 Days</option>
            <option value="30">30 Days</option>
          </select>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="kpi-grid">

        <div className="kpi-card">
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
          <h3>₹ {totalValue}</h3>
        </div>

      </div>

      {/* CHARTS */}
      <div className="charts-wrapper">

        <div className="chart-card big">
          <h5><i className="bi bi-graph-up-arrow text-primary me-1"></i>Items Trend</h5>
          <Line data={lineData} options={lineOptions} />
        </div>

        <div className="chart-card small">
          <h5><i className="bi bi-bar-chart text-info me-1"></i>Status Distribution</h5>
          <Pie data={pieData} options={pieOptions} />
        </div>
        <div className="chart-card">
          <h5><i className="bi bi-calendar3 text-primary me-1"></i>Monthly Analytics</h5>
          <canvas ref={chartRef}></canvas>
        </div>

        <div className="chart-card">
          <h5><i className="bi bi-list-task text-info me-1"></i>Top Categories</h5>
          <canvas ref={pieRef}></canvas>
        </div>
      </div>

      <div className="top-items-card">
        <h3><i className="bi bi-list-task text-info me-1"></i>Top 5 Expensive Items</h3>

        <div className="top-items-list">
          {topExpensiveItems.length === 0 && (
            <p>No data available</p>
          )}

          {topExpensiveItems.map((item, index) => (
            <div key={item.id} className="top-item">

              <div className="item-rank">
                #{index + 1}
              </div>

              <div className="item-details">
                <div className="item-name">{item.name}</div>
                <div className="item-supplier">
                  {item.supplier || "N/A"}
                </div>
              </div>

              <div className="item-price">
                ₹ {Number(item.price).toLocaleString()}
              </div>

            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-row">

        {/* 🔹 VALUE CHART */}
        <div className="dashboard-col">
          <div className="card-box">

            <div className="card-header">
              <h3><i className="bi bi-currency-rupee text-primary me-1"></i> Inventory Value</h3>

              <div className="toggle-wrapper">
                <div
                  className={`toggle-slider ${valueView === "daily" ? "left" : "right"
                    }`}
                ></div>

                <button className="fw-semibold" onClick={() => setValueView("daily")}>
                  Daily
                </button>

                <button className="fw-semibold" onClick={() => setValueView("monthly")}>
                  Monthly
                </button>
              </div>
            </div>

            <div className="chart-container">
              <canvas ref={valueChartRef}></canvas>
            </div>

          </div>
        </div>

        {/* 🔹 ITEMS TREND CHART */}
        <div className="dashboard-col">
          <div className="card-box">

            <div className="card-header">
              <h3><i className="bi bi-graph-up text-success me-1"></i> Inventory Trend</h3>

              <div className="toggle-wrapper">
                <div
                  className={`toggle-slider ${activeChart === "daily" ? "left" : "right"
                    }`}
                ></div>

                <button className="fw-semibold" onClick={() => setActiveChart("daily")}>
                  Daily
                </button>

                <button className="fw-semibold" onClick={() => setActiveChart("growth")}>
                  Growth
                </button>
              </div>
            </div>

            {/* <div className="chart-container">
              {activeChart === "daily" && (
                <canvas ref={dailyChartRef}></canvas>
              )}

              {activeChart === "growth" && (
                <canvas ref={growthChartRef}></canvas>
              )}
            </div> */}

            <div className="chart-container">
              <canvas ref={chart_Ref}></canvas>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;