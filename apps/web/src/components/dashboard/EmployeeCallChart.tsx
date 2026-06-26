"use client";

import dynamic from "next/dynamic";
import dayjs from "dayjs";
import { useMyCallStats } from "@/hooks/useDashboard";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function EmployeeCallChart() {
  const { data, isLoading } = useMyCallStats();

  const daily = data?.daily ?? [];
  const categories = daily.map((d) => dayjs(d.date).format("D MMM"));
  const callCounts = daily.map((d) => d.callCount);
  const minutes = daily.map((d) => d.totalMinutes);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      toolbar: { show: false },
      background: "transparent",
    },
    colors: ["#005826", "#22c55e"],
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: "55%" },
    },
    dataLabels: { enabled: false },
    stroke: {
      width: [0, 2],
      curve: "smooth",
    },
    xaxis: {
      categories,
      labels: { style: { fontSize: "11px" } },
    },
    yaxis: [
      {
        seriesName: "Calls",
        title: { text: "Calls", style: { fontSize: "11px" } },
        labels: { style: { fontSize: "11px" } },
        min: 0,
      },
      {
        seriesName: "Minutes Talked",
        opposite: true,
        title: { text: "Minutes", style: { fontSize: "11px" } },
        labels: { style: { fontSize: "11px" } },
        min: 0,
      },
    ],
    legend: { position: "top", fontSize: "12px" },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
    tooltip: { shared: true, intersect: false },
  };

  const series: ApexCharts.ApexOptions["series"] = [
    { name: "Calls", type: "bar", data: callCounts },
    { name: "Minutes Talked", type: "line", data: minutes },
  ];

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">
        My Call Activity — Last 7 Days
      </h3>

      {isLoading ? (
        <div className="h-48 bg-surface-50 rounded animate-pulse" />
      ) : daily.every((d) => d.callCount === 0) ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">
          No calls logged in the last 7 days
        </div>
      ) : (
        <ApexChart type="line" height={220} series={series} options={options} />
      )}
    </div>
  );
}
