"use client";

import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { useWorkloadBalance } from "@/hooks/useDashboard";
import { ChartCard, Chart } from "@/components/charts/ChartCard";
import { CHART_COLORS } from "@/config/chartTheme";

type WorkloadRow = {
  employee: { id: string; name: string };
  openLeads: number;
  vsMedian: number;
};

// Open-lead count per employee vs. the branch median — lets a manager spot
// who's overloaded and who has room for more leads (PRD §4 Workload row).
export function WorkloadChart() {
  const { branchId } = useAnalyticsFilters();
  const { data, isLoading } = useWorkloadBalance(branchId);

  const rows =
    (data as { employees?: WorkloadRow[]; median?: number } | undefined)?.employees ?? [];
  const median = (data as { median?: number } | undefined)?.median ?? 0;

  const options: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
    plotOptions: { bar: { horizontal: false, borderRadius: 4, columnWidth: "55%" } },
    colors: [CHART_COLORS.primary],
    dataLabels: { enabled: false },
    xaxis: {
      categories: rows.map((r) => r.employee.name),
      labels: { style: { fontSize: "11px" }, rotate: -30 },
    },
    yaxis: { labels: { style: { fontSize: "11px" } }, title: { text: "Open leads" } },
    grid: { borderColor: CHART_COLORS.grid, strokeDashArray: 4 },
    ...(median
      ? {
          annotations: {
            yaxis: [
              {
                y: median,
                borderColor: CHART_COLORS.accentGreen,
                label: {
                  text: `Median (${median})`,
                  style: { fontSize: "10px", background: CHART_COLORS.accentGreen, color: "#fff" },
                },
              },
            ],
          },
        }
      : {}),
    tooltip: {
      y: {
        formatter: (v: number, opts) => {
          const row = rows[opts?.dataPointIndex ?? 0];
          const rel = row && row.vsMedian !== 0 ? ` (${row.vsMedian > 0 ? "+" : ""}${row.vsMedian}% vs median)` : "";
          return `${v} open leads${rel}`;
        },
      },
    },
  };

  return (
    <ChartCard
      title="Team Workload"
      isLoading={isLoading}
      isEmpty={rows.length === 0}
      emptyMessage="No employees in this branch"
      height={220}
    >
      <Chart
        type="bar"
        height={220}
        series={[{ name: "Open leads", data: rows.map((r) => r.openLeads) }]}
        options={options}
      />
    </ChartCard>
  );
}
