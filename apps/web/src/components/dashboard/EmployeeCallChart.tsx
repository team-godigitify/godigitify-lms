"use client";

import dayjs from "dayjs";
import { useMyCallStats } from "@/hooks/useDashboard";
import { ChartCard, Chart } from "@/components/charts/ChartCard";
import { CHART_COLORS } from "@/config/chartTheme";

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
    colors: [CHART_COLORS.primary, CHART_COLORS.accentGreen],
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
    grid: { borderColor: CHART_COLORS.grid, strokeDashArray: 4 },
    tooltip: { shared: true, intersect: false },
  };

  const series: ApexCharts.ApexOptions["series"] = [
    { name: "Calls", type: "bar", data: callCounts },
    { name: "Minutes Talked", type: "line", data: minutes },
  ];

  const isEmpty = daily.length === 0 || daily.every((d) => d.callCount === 0);

  return (
    <ChartCard
      title="My Call Activity — Last 7 Days"
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="No calls logged in the last 7 days"
      height={220}
    >
      <Chart type="line" height={220} series={series} options={options} />
    </ChartCard>
  );
}
