"use client";

import { useTrend } from "@/hooks/useDashboard";
import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { ChartCard, Chart } from "@/components/charts/ChartCard";
import { CHART_COLORS } from "@/config/chartTheme";
import dayjs from "dayjs";

export function TrendChart() {
  const { period, branchId } = useAnalyticsFilters();
  const { data, isLoading } = useTrend(period, branchId);

  type TrendPoint = { date: string; created: number; confirmed: number };
  const trend: TrendPoint[] =
    (data as { trend?: TrendPoint[] } | undefined)?.trend ?? [];

  const categories = trend.map((t: TrendPoint) =>
    dayjs(t.date).format("D MMM"),
  );
  const created = trend.map((t: TrendPoint) => t.created);
  const confirmed = trend.map((t: TrendPoint) => t.confirmed);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      background: "transparent",
    },
    colors: [CHART_COLORS.primary, CHART_COLORS.accentGreen],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.3,
        opacityTo: 0.05,
      },
    },
    xaxis: {
      categories,
      labels: {
        style: { fontSize: "10px" },
        rotate: -45,
        rotateAlways: false,
      },
      tickAmount: 6,
    },
    yaxis: {
      labels: { style: { fontSize: "11px" } },
      min: 0,
    },
    grid: { borderColor: CHART_COLORS.grid, strokeDashArray: 4 },
    legend: {
      position: "top",
      fontSize: "12px",
    },
    tooltip: {
      x: { show: true },
    },
    dataLabels: { enabled: false },
  };

  return (
    <ChartCard title="Leads & Confirmations" isLoading={isLoading} height={220}>
      <Chart
        type="area"
        height={220}
        series={[
          { name: "Leads Created", data: created },
          { name: "Clients", data: confirmed },
        ]}
        options={options}
      />
    </ChartCard>
  );
}
