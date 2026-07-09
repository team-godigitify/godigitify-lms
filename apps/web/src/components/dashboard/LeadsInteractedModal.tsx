"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MessageSquare, Phone, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useEmployeeInteractedLeads, useMyInteractedLeads } from "@/hooks/useDashboard";
import type { Period } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

dayjs.extend(relativeTime);

type Props = {
  open: boolean;
  onClose: () => void;
  /** Omit to show the current user's own interacted leads (GET /analytics/me/interacted-leads). */
  employeeId?: string | undefined;
  employeeName?: string | undefined;
  period: Period;
};

// Lists the unique leads behind a "Leads Interacted" / "Leads Touched" stat
// card — one row per lead (see getEmployeeInteractedLeads), so the count
// here always matches. Each row links straight to its lead.
export function LeadsInteractedModal({ open, onClose, employeeId, employeeName, period }: Props) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) setPage(1);
  }, [open, employeeId, period]);

  const employeeQuery = useEmployeeInteractedLeads(employeeId ?? "", period, page, open && !!employeeId);
  const meQuery = useMyInteractedLeads(period, page, open && !employeeId);
  const { data, isLoading } = employeeId ? employeeQuery : meQuery;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employeeName ? `Leads Interacted — ${employeeName}` : "Leads I've Interacted With"}
      size="lg"
    >
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : !data || data.leads.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No lead activity in this period.
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-500">{data.total} lead{data.total === 1 ? "" : "s"} total</p>
            <ul className="divide-y divide-surface-100 max-h-[60vh] overflow-y-auto -mx-2">
              {data.leads.map((entry, idx) => (
                <li key={entry.lead?.id ?? idx}>
                  <Link
                    href={entry.lead ? `/leads/${entry.lead.id}` : "#"}
                    onClick={onClose}
                    className={cn(
                      "flex items-start gap-3 px-2 py-3 rounded-lg transition-colors",
                      entry.lead ? "hover:bg-surface-50 cursor-pointer" : "cursor-default pointer-events-none opacity-70",
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {entry.lead?.name || entry.lead?.phone || "Unknown lead"}
                        </span>
                        <span
                          className="text-xs text-gray-400 shrink-0"
                          title={dayjs(entry.lastInteractionAt).format("D MMM YYYY, h:mm A")}
                        >
                          {dayjs(entry.lastInteractionAt).fromNow()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500">
                          {entry.interactionCount} interaction{entry.interactionCount === 1 ? "" : "s"}
                        </span>
                        {entry.callCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-cyan-600">
                            <Phone size={11} /> {entry.callCount}
                          </span>
                        )}
                        {entry.lead?.status && (
                          <span className="text-xs text-gray-400">{entry.lead.status}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed hover:text-primary px-2 py-1"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="text-xs text-gray-400">
                  Page {data.page} of {data.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={page >= data.totalPages}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed hover:text-primary px-2 py-1"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
