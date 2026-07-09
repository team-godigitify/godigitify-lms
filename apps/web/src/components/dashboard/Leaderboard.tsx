"use client";

import Link from "next/link";
import { useEmployeePerformance } from "@/hooks/useDashboard";
import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { cn } from "@/lib/utils";
import { Trophy, TrendingUp, Users, Star, ChevronRight } from "lucide-react";

type EmployeeRow = {
  employee: { id: string; name: string };
  metrics: {
    performanceScore: number;
    totalAssigned: number;
    confirmed: number;
    confirmationRate: number;
    callCount: number;
  };
};

const MEDAL: Record<number, { emoji: string; bg: string; text: string }> = {
  0: { emoji: "🥇", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  1: { emoji: "🥈", bg: "bg-slate-50 border-slate-200", text: "text-slate-600" },
  2: { emoji: "🥉", bg: "bg-orange-50 border-orange-200", text: "text-orange-700" },
};

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 bg-surface-100 rounded-full h-1.5 min-w-0">
        <div
          className="h-1.5 rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs font-bold text-primary shrink-0 w-8 text-right">
        {value}
      </span>
    </div>
  );
}

export function Leaderboard() {
  const { period, branchId } = useAnalyticsFilters();
  const { data, isLoading } = useEmployeePerformance(period, branchId);

  const employees: EmployeeRow[] =
    data &&
    typeof data === "object" &&
    "employees" in data &&
    Array.isArray((data as { employees?: unknown }).employees)
      ? ((data as { employees: EmployeeRow[] }).employees ?? [])
      : [];

  const ranked = [...employees]
    .sort((a, b) => b.metrics.performanceScore - a.metrics.performanceScore)
    .slice(0, 10);

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-50 rounded-lg flex items-center justify-center">
            <Trophy size={14} className="text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">
            Performance Leaderboard
          </h3>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-surface-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : ranked.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">
          No employee data for this period
        </div>
      ) : (
        <div className="space-y-2">
          {ranked.map((row, idx) => {
            const medal = MEDAL[idx];
            const initials = row.employee.name.slice(0, 2).toUpperCase();
            const empId = row.employee.id;
            return (
              <div
                key={empId}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-lg border group",
                  medal
                    ? medal.bg
                    : "bg-surface-50 border-surface-100",
                )}
              >
                {/* Rank */}
                <div className="w-7 text-center shrink-0">
                  {medal ? (
                    <span className="text-base leading-none">{medal.emoji}</span>
                  ) : (
                    <span className="text-xs font-bold text-gray-400">
                      #{idx + 1}
                    </span>
                  )}
                </div>

                {/* Avatar + Name — links to employee detail page */}
                <Link
                  href={`/analytics/employees/${empId}`}
                  className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                      medal ? `${medal.text} bg-white` : "bg-primary-100 text-primary",
                    )}
                  >
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold truncate",
                        medal ? medal.text : "text-gray-700",
                      )}
                    >
                      {row.employee.name}
                    </p>
                    <ScoreBar value={row.metrics.performanceScore} />
                  </div>
                </Link>

                {/* Clickable stats */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Clients → leads filtered by employee + CLIENT status */}
                  <Link
                    href={`/leads?assignedToId=${empId}&status=CLIENT`}
                    title="Clients closed"
                    className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 px-2 py-1.5 rounded transition-colors"
                  >
                    <Star size={11} />
                    <span className="text-xs font-semibold">
                      {row.metrics.confirmed}
                    </span>
                  </Link>

                  {/* Total assigned → all leads for employee */}
                  <Link
                    href={`/leads?assignedToId=${empId}`}
                    title="Total leads assigned"
                    className="flex items-center gap-1 text-blue-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded transition-colors"
                  >
                    <Users size={11} />
                    <span className="text-xs">
                      {row.metrics.totalAssigned}
                    </span>
                  </Link>

                  {/* Conv % → employee detail */}
                  <Link
                    href={`/analytics/employees/${empId}`}
                    title="Conversion rate — view full report"
                    className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded transition-colors"
                  >
                    <TrendingUp size={11} />
                    <span className="text-xs">
                      {row.metrics.confirmationRate}%
                    </span>
                  </Link>

                  <ChevronRight size={13} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ranked.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          Score = weighted blend of close rate, calls, follow-up compliance &amp; response time · click any row for full report
        </p>
      )}
    </div>
  );
}
