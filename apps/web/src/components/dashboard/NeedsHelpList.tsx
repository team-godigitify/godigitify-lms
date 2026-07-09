"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { useEmployeePerformance } from "@/hooks/useDashboard";

type EmployeeRow = {
  employee: { id: string; name: string };
  metrics: {
    performanceScore: number;
    overdueFollowUps: number;
    followUpComplianceRate: number;
    avgResponseHours: number | null;
  };
};

const SCORE_THRESHOLD = 50;

// Reuses the same performanceScore/complianceRate/overdueFollowUps already
// computed by getEmployeePerformance — no new calculation, just a filtered
// view flagging *why* each employee needs attention (PRD §3/§4 coaching list).
export function NeedsHelpList() {
  const { period, branchId } = useAnalyticsFilters();
  const { data, isLoading } = useEmployeePerformance(period, branchId);

  const employees: EmployeeRow[] = Array.isArray((data as { employees?: unknown })?.employees)
    ? ((data as { employees?: EmployeeRow[] }).employees ?? [])
    : [];

  const needsHelp = employees
    .filter((e) => e.metrics.performanceScore < SCORE_THRESHOLD || e.metrics.overdueFollowUps > 0)
    .sort((a, b) => a.metrics.performanceScore - b.metrics.performanceScore);

  function reason(e: EmployeeRow): string {
    if (e.metrics.overdueFollowUps > 0) {
      return `${e.metrics.overdueFollowUps} overdue follow-up${e.metrics.overdueFollowUps > 1 ? "s" : ""}`;
    }
    if (e.metrics.followUpComplianceRate < 50) return "Low follow-up compliance";
    if (e.metrics.avgResponseHours !== null && e.metrics.avgResponseHours > 24) {
      return "Slow response time";
    }
    return "Below-target performance score";
  }

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
          <AlertTriangle size={14} className="text-amber-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Needs Help</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : needsHelp.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Everyone on the team is on track
        </p>
      ) : (
        <div className="space-y-2">
          {needsHelp.map((e) => (
            <Link
              key={e.employee.id}
              href={`/analytics/employees/${e.employee.id}`}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-amber-100 bg-amber-50 hover:border-amber-300 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-gray-800">{e.employee.name}</p>
                <p className="text-xs text-amber-700 mt-0.5">{reason(e)}</p>
              </div>
              <span className="text-xs font-bold text-amber-700 shrink-0">
                {e.metrics.performanceScore}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
