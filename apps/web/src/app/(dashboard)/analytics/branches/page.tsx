"use client";

import { useState } from "react";
import Link from "next/link";
import { Role } from "@lms/types";
import { AuthGuard } from "@/components/AuthGuard";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { useBranchComparison } from "@/hooks/useDashboard";
import { formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Period } from "@/hooks/useDashboard";

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 min-w-28">
      <div className="flex-1 bg-surface-100 rounded-full h-1.5">
        <div className={cn("h-1.5 rounded-full", color)} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-7 text-right">{score}</span>
    </div>
  );
}

function BranchesPageContent() {
  const [period, setPeriod] = useState<Period>("last30");
  const { data, isLoading } = useBranchComparison(period);
  const branches = data?.branches ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <div className="bg-white border border-surface-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Branch Comparison</h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-surface-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : branches.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No branches yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 text-left text-xs text-gray-400">
                  <th className="pb-2 pr-3">Branch</th>
                  <th className="pb-2 px-3 text-right">Revenue</th>
                  <th className="pb-2 px-3 text-right">Pipeline Value</th>
                  <th className="pb-2 px-3 text-right">Headcount</th>
                  <th className="pb-2 px-3 text-right">Overdue</th>
                  <th className="pb-2 pl-3">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {branches.map((b) => (
                  <tr key={b.branch.id}>
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/leads?branchId=${b.branch.id}`}
                        className="font-medium text-gray-700 hover:text-primary"
                      >
                        {b.branch.name}
                      </Link>
                      <p className="text-xs text-gray-400">{b.branch.city}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-green-600">
                      {formatRupees(b.revenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-600">
                      {formatRupees(b.estimatedPipelineValue)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{b.headcount}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/leads?branchId=${b.branch.id}&overdue=true`}
                        className={cn(
                          "font-semibold hover:underline",
                          b.overdueLeads > 0 ? "text-red-500" : "text-green-600",
                        )}
                      >
                        {b.overdueLeads}
                      </Link>
                    </td>
                    <td className="py-2.5 pl-3">
                      <HealthBar score={b.healthScore} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BranchesPage() {
  return (
    <AuthGuard allowedRoles={[Role.ADMIN]} redirectTo="/analytics/revenue">
      <BranchesPageContent />
    </AuthGuard>
  );
}
