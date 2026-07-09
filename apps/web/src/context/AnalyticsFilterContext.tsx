"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Period } from "@/hooks/useDashboard";

type AnalyticsFilters = {
  period: Period;
  branchId: string | undefined;
  setPeriod: (period: Period) => void;
  setBranchId: (branchId: string | undefined) => void;
};

const VALID_PERIODS: Period[] = ["today", "week", "last30", "last90", "custom"];

const AnalyticsFilterContext = createContext<AnalyticsFilters | null>(null);

// Shared filter state (period + branch) for every dashboard/analytics widget
// on a page, synced to the URL so it's shareable/bookmarkable and so every
// widget reads the exact same filters instead of owning independent state.
export function AnalyticsFilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const periodParam = searchParams.get("period");
  const period: Period = (VALID_PERIODS as string[]).includes(periodParam ?? "")
    ? (periodParam as Period)
    : "last30";
  const branchId = searchParams.get("branchId") ?? undefined;

  const updateParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setPeriod = useCallback((p: Period) => updateParam("period", p), [updateParam]);
  const setBranchId = useCallback(
    (id: string | undefined) => updateParam("branchId", id),
    [updateParam],
  );

  const value = useMemo<AnalyticsFilters>(
    () => ({ period, branchId, setPeriod, setBranchId }),
    [period, branchId, setPeriod, setBranchId],
  );

  return (
    <AnalyticsFilterContext.Provider value={value}>
      {children}
    </AnalyticsFilterContext.Provider>
  );
}

export function useAnalyticsFilters(): AnalyticsFilters {
  const ctx = useContext(AnalyticsFilterContext);
  if (!ctx) {
    throw new Error("useAnalyticsFilters must be used within an AnalyticsFilterProvider");
  }
  return ctx;
}
