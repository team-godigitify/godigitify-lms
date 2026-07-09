"use client";

import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { HeartCrack } from "lucide-react";
import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { useClientsAtRisk } from "@/hooks/useDashboard";

dayjs.extend(relativeTime);

type ClientRisk = {
  id: string;
  name: string | null;
  phone: string;
  confirmedAt: string | null;
  assignedTo: { id: string; name: string } | null;
  dealValue: number;
};

// Won deals with no interaction in 14+ days — clients who've gone quiet
// after closing (PRD §4 "Clients requiring attention").
export function ClientsAtRiskList() {
  const { branchId } = useAnalyticsFilters();
  const { data, isLoading } = useClientsAtRisk(branchId);

  const clients: ClientRisk[] =
    (data as { clients?: ClientRisk[] } | undefined)?.clients ?? [];

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
          <HeartCrack size={14} className="text-red-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Clients Requiring Attention</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Every client has had recent contact
        </p>
      ) : (
        <div className="space-y-2">
          {clients.slice(0, 8).map((c) => (
            <Link
              key={c.id}
              href={`/leads/${c.id}`}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-surface-100 hover:border-primary-200 hover:bg-surface-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {c.name ?? c.phone}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Closed by {c.assignedTo?.name ?? "—"}
                  {c.confirmedAt ? ` · ${dayjs(c.confirmedAt).fromNow()}` : ""}
                </p>
              </div>
              {c.dealValue > 0 && (
                <span className="text-xs font-semibold text-gray-600 shrink-0">
                  ₹{c.dealValue.toLocaleString("en-IN")}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
