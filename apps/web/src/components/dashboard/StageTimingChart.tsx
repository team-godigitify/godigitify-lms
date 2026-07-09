"use client";

import { usePipeline } from "@/hooks/useDashboard";
import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { ChartCard, Chart } from "@/components/charts/ChartCard";
import { CHART_COLORS } from "@/config/chartTheme";
import { STATUS_CONFIG } from "@/config/leadStatus";
import type { LeadStatus } from "@lms/types";

type StatusRow = { status: string; count: number; avgDaysInStage: number | null };

// How long leads sit in each stage before moving on — the funnel-count chart
// (PipelineChart) shows *where* leads are; this shows *how stuck* they are.
export function StageTimingChart() {
  const { branchId } = useAnalyticsFilters();
  const { data, isLoading } = usePipeline(branchId);

  const rows = (
    (data as { statusBreakdown?: StatusRow[] } | undefined)?.statusBreakdown ?? []
  ).filter((s) => s.avgDaysInStage !== null && s.count > 0);

  const options: ApexCharts.ApexOptions = {
    chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "70%" } },
    colors: [CHART_COLORS.primaryLight],
    dataLabels: {
      enabled: true,
      formatter: (v: number) => `${v}d`,
      style: { fontSize: "11px" },
    },
    xaxis: {
      categories: rows.map((s) => STATUS_CONFIG[s.status as LeadStatus]?.label ?? s.status),
      title: { text: "Avg. days in stage" },
      labels: { style: { fontSize: "11px" } },
    },
    grid: { borderColor: CHART_COLORS.grid, strokeDashArray: 4 },
    tooltip: { y: { formatter: (v: number) => `${v} days on average` } },
  };

  return (
    <ChartCard
      title="Time in Stage"
      isLoading={isLoading}
      isEmpty={rows.length === 0}
      emptyMessage="Not enough stage-change history yet"
      height={280}
    >
      <Chart
        type="bar"
        height={280}
        series={[{ name: "Avg days", data: rows.map((s) => s.avgDaysInStage ?? 0) }]}
        options={options}
      />
    </ChartCard>
  );
}
