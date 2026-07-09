"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUS_CONFIG } from "@/config/leadStatus";
import { usePipeline } from "@/hooks/useDashboard";
import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { ChartCard, Chart } from "@/components/charts/ChartCard";
import { CHART_COLORS } from "@/config/chartTheme";
import { LeadStatus } from "@lms/types";

// Pipeline reading order (not count order) so the chart reads as a funnel —
// forward stages first, then the terminal loss/duplicate states.
const PIPELINE_ORDER: LeadStatus[] = [
  LeadStatus.NEW,
  LeadStatus.ATTEMPTED_CONTACT,
  LeadStatus.CONNECTED,
  LeadStatus.INTERESTED,
  LeadStatus.FOLLOW_UP_SCHEDULED,
  LeadStatus.NEGOTIATING,
  LeadStatus.PROPOSAL_SENT,
  LeadStatus.CLIENT,
  LeadStatus.LOST,
  LeadStatus.NOT_INTERESTED,
  LeadStatus.NOT_REACHABLE,
  LeadStatus.DUPLICATE,
];

const STATUS_HEX: Record<string, string> = {
  "bg-blue-500": "#3b82f6",
  "bg-orange-500": "#f97316",
  "bg-cyan-500": "#06b6d4",
  "bg-violet-500": "#8b5cf6",
  "bg-amber-500": "#f59e0b",
  "bg-indigo-500": "#6366f1",
  "bg-pink-500": "#ec4899",
  "bg-green-500": "#16a34a",
  "bg-red-500": "#ef4444",
  "bg-gray-400": "#9ca3af",
  "bg-rose-500": "#f43f5e",
  "bg-slate-400": "#94a3b8",
};

export function PipelineChart() {
  const router = useRouter();
  const { branchId } = useAnalyticsFilters();
  const { data, isLoading } = usePipeline(branchId);

  const statuses =
    data &&
    typeof data === "object" &&
    "statusBreakdown" in data &&
    Array.isArray((data as { statusBreakdown?: unknown }).statusBreakdown)
      ? ((data as { statusBreakdown: Array<{ status: string; count: number }> })
          .statusBreakdown ?? [])
      : [];

  // Sort by pipeline sequence — this ApexCharts config plots the first
  // category at the top, so NEW ends up first/topmost as intended without
  // needing a reverse (verified visually; an earlier reverse() here put the
  // funnel upside down — terminal states on top, NEW at the bottom).
  const sorted = [...statuses].sort(
    (a, b) =>
      PIPELINE_ORDER.indexOf(a.status as LeadStatus) -
      PIPELINE_ORDER.indexOf(b.status as LeadStatus),
  );

  const categories = sorted.map(
    (s) => STATUS_CONFIG[s.status as LeadStatus]?.label ?? s.status,
  );
  const values = sorted.map((s) => s.count);
  const colors = sorted.map((s) => {
    const dotClass = STATUS_CONFIG[s.status as LeadStatus]?.dot ?? "bg-gray-400";
    return STATUS_HEX[dotClass] ?? CHART_COLORS.primary;
  });

  // Same status equality + branchId the bar's own count came from
  // (getPipelineAnalysis's groupBy) — a click always lands on a leads list
  // whose total matches the bar it came from.
  function goToStatus(dataPointIndex: number) {
    const status = sorted[dataPointIndex]?.status;
    if (!status) return;
    const params = new URLSearchParams({ status });
    if (branchId) params.set("branchId", branchId);
    router.push(`/leads?${params}`);
  }

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      background: "transparent",
      events: {
        dataPointSelection: (_event, _chartContext, config) => {
          if (config) goToStatus(config.dataPointIndex);
        },
      },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: "70%",
        distributed: true,
      },
    },
    colors,
    dataLabels: {
      enabled: true,
      style: { fontSize: "11px", fontWeight: 600 },
    },
    legend: { show: false },
    xaxis: {
      categories,
      labels: { style: { fontSize: "11px" } },
    },
    yaxis: {
      labels: { style: { fontSize: "11px" } },
    },
    grid: {
      borderColor: CHART_COLORS.grid,
      strokeDashArray: 4,
    },
    tooltip: {
      y: { formatter: (v) => `${v} leads` },
    },
  };

  const isEmpty = sorted.length === 0 || values.every((v) => v === 0);

  return (
    <ChartCard
      title="Lead Pipeline Overview"
      action={
        <Link
          href="/leads"
          className="text-xs text-primary font-medium hover:underline"
        >
          View all →
        </Link>
      }
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyMessage="No leads in the system yet"
      emptyAction={
        <Link
          href="/leads/new"
          className="text-xs text-primary font-medium hover:underline mt-1"
        >
          Add your first lead →
        </Link>
      }
      height={280}
    >
      <div className="[&_.apexcharts-bar-area]:cursor-pointer">
        <Chart
          type="bar"
          height={280}
          series={[{ name: "Leads", data: values }]}
          options={options}
        />
      </div>
    </ChartCard>
  );
}
