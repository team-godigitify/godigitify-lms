"use client";

import { Target as TargetIcon } from "lucide-react";
import dayjs from "dayjs";
import { useMyPerformance, useMyTarget } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

type Metrics = { revenueClosed?: number };

// Month-to-date revenue vs. this employee's REVENUE target for the current
// month, if one has been set (via /settings/targets, ADMIN/SUB_ADMIN only —
// see docs/analytics-prd.md §16/§7). Empty state is honest: most employees
// won't have a target set until that management UI ships.
export function MyTargetProgress() {
  const monthStart = dayjs().startOf("month").format("YYYY-MM-DD");
  const today = dayjs().format("YYYY-MM-DD");
  const currentPeriod = dayjs().format("YYYY-MM");

  const { data: perf, isLoading: perfLoading } = useMyPerformance("custom", monthStart, today);
  const { data: target, isLoading: targetLoading } = useMyTarget("REVENUE", currentPeriod);

  const revenueClosed = (perf as { metrics?: Metrics } | undefined)?.metrics?.revenueClosed ?? 0;
  const targetValue = target ? Number(target.value) : null;
  const percent = targetValue && targetValue > 0 ? Math.min(100, Math.round((revenueClosed / targetValue) * 100)) : null;

  const isLoading = perfLoading || targetLoading;

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <TargetIcon size={14} className="text-primary" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          My Target — {dayjs().format("MMMM")}
        </p>
      </div>

      {isLoading ? (
        <div className="h-8 bg-surface-100 rounded animate-pulse" />
      ) : percent === null ? (
        <p className="text-sm text-gray-400">No target set for this month</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-lg font-bold text-gray-800">
              ₹{revenueClosed.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-gray-400">
              of ₹{targetValue!.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="bg-surface-100 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                percent >= 80 ? "bg-green-500" : percent >= 40 ? "bg-amber-400" : "bg-red-400",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{percent}% of target</p>
        </>
      )}
    </div>
  );
}
