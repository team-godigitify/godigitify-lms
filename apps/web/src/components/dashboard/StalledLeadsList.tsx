"use client";

import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Flame } from "lucide-react";
import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { useLeadsAtRisk } from "@/hooks/useDashboard";
import { StatusBadge } from "@/components/leads/StatusBadge";
import type { LeadStatus } from "@lms/types";

dayjs.extend(relativeTime);

// Non-terminal leads with no interaction in 5+ days — the pipeline is
// "healthy vs. clogged" question made concrete (PRD §3/§4 stalled-deal list).
export function StalledLeadsList() {
  const { branchId } = useAnalyticsFilters();
  const { data, isLoading } = useLeadsAtRisk(branchId ? { branchId } : undefined);

  const leads = data?.leads ?? [];

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center">
          <Flame size={14} className="text-orange-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">
          Stalled Leads {data ? `(${data.totalAtRisk})` : ""}
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          No leads have gone quiet — pipeline is healthy
        </p>
      ) : (
        <div className="space-y-2">
          {leads.slice(0, 8).map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-surface-100 hover:border-primary-200 hover:bg-surface-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {lead.name ?? lead.phone}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {lead.assignedTo?.name ?? "Unassigned"} · added {dayjs(lead.createdAt).fromNow()}
                </p>
              </div>
              <StatusBadge status={lead.status as LeadStatus} size="sm" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
