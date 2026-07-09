"use client";

import { ClipboardCheck } from "lucide-react";
import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { useFollowUpCompliance } from "@/hooks/useDashboard";

type ComplianceData = {
  totalOverdue: number;
  neverActedCount: number;
};

// Branch-wide follow-up compliance snapshot — reuses getFollowUpCompliance,
// the same calculation the per-employee "Overdue Follow-ups" figures use.
export function FollowUpComplianceSummary() {
  const { branchId } = useAnalyticsFilters();
  const { data, isLoading } = useFollowUpCompliance(branchId);

  const compliance = data as ComplianceData | undefined;

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-primary-50 rounded-lg flex items-center justify-center">
          <ClipboardCheck size={14} className="text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Branch Follow-up Compliance</h3>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-50 rounded-lg px-3 py-2.5">
            <p className="text-[11px] text-amber-600">Overdue Follow-ups</p>
            <p className="text-lg font-bold text-amber-700">{compliance?.totalOverdue ?? 0}</p>
          </div>
          <div className="bg-red-50 rounded-lg px-3 py-2.5">
            <p className="text-[11px] text-red-600">Never Acted On</p>
            <p className="text-lg font-bold text-red-700">{compliance?.neverActedCount ?? 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
