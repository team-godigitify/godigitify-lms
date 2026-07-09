"use client";

import { PeriodSelector } from "./PeriodSelector";
import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { useBranches } from "@/hooks/useBranches";
import { useAuthStore } from "@/store/auth";
import { Role } from "@lms/types";

type Branch = { id: string; name: string };

// Single filter bar shared by every dashboard/analytics widget on the page —
// replaces the per-widget PeriodSelector instances that used to each own
// independent state. Branch filtering is ADMIN-only in the UI: SUB_ADMIN is
// already locked server-side to their own branch regardless of this control.
export function GlobalFilterBar() {
  const { user } = useAuthStore();
  const { period, setPeriod, branchId, setBranchId } = useAnalyticsFilters();
  const { data: branches } = useBranches();
  const isAdmin = user?.role === Role.ADMIN;

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      {isAdmin ? (
        <select
          value={branchId ?? ""}
          onChange={(e) => setBranchId(e.target.value || undefined)}
          className="text-xs font-medium bg-surface-100 border border-surface-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          <option value="">All Branches</option>
          {((branches as Branch[] | undefined) ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      ) : (
        <div />
      )}
      <PeriodSelector value={period} onChange={setPeriod} />
    </div>
  );
}
