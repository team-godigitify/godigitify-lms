"use client";

import { useSourceReport } from "@/hooks/useDashboard";
import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { ChartCard, Chart } from "@/components/charts/ChartCard";
import { CHART_PALETTE } from "@/config/chartTheme";

export function LeadSourcesChart() {
  const { period, branchId } = useAnalyticsFilters();
  const { data, isLoading } = useSourceReport(period, branchId);

  type SourceItem = {
    total: number;
    source: { name: string };
    conversionRate?: number;
  };

  const sources =
    (data as { sources?: SourceItem[] } | undefined)?.sources?.filter(
      (s) => s.total > 0,
    ) ?? [];

  const options: ApexCharts.ApexOptions = {
    chart: { type: "donut", background: "transparent" },
    labels: sources.map((s) => s.source.name),
    colors: CHART_PALETTE,
    legend: {
      position: "bottom",
      fontSize: "11px",
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${Math.round(val)}%`,
      style: { fontSize: "10px" },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "65%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              formatter: () =>
                String(
                  sources.reduce((a: number, s: SourceItem) => a + s.total, 0),
                ),
              fontSize: "16px",
              fontWeight: 700,
              color: "#111827",
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (v: number, opts) => {
          const src = sources[opts?.seriesIndex ?? 0];
          return `${v} leads · ${src?.conversionRate ?? 0}% conversion`;
        },
      },
    },
  };

  return (
    <ChartCard title="Lead Sources" isLoading={isLoading} isEmpty={sources.length === 0} height={220}>
      <Chart
        type="donut"
        height={220}
        series={sources.map((s) => s.total)}
        options={options}
      />
    </ChartCard>
  );
}
