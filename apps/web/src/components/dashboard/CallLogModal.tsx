"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Phone, PhoneIncoming, PhoneOutgoing, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useEmployeeCallLog, useMyCallLog } from "@/hooks/useDashboard";
import type { Period } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

dayjs.extend(relativeTime);

function formatDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Omit to show the current user's own call log (GET /analytics/me/calls). */
  employeeId?: string | undefined;
  employeeName?: string | undefined;
  period: Period;
};

// Lists the individual CALL interactions behind a "Calls Made" / "Total
// Calls" stat card. Uses the same period/userId query the card's count came
// from (see getEmployeeCallLog), so the number here always matches. Each row
// links straight to its lead.
export function CallLogModal({ open, onClose, employeeId, employeeName, period }: Props) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) setPage(1);
  }, [open, employeeId, period]);

  const employeeQuery = useEmployeeCallLog(employeeId ?? "", period, page, open && !!employeeId);
  const meQuery = useMyCallLog(period, page, open && !employeeId);
  const { data, isLoading } = employeeId ? employeeQuery : meQuery;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employeeName ? `Calls — ${employeeName}` : "My Calls"}
      size="lg"
    >
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : !data || data.calls.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No calls logged in this period.
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-500">{data.total} call{data.total === 1 ? "" : "s"} total</p>
            <ul className="divide-y divide-surface-100 max-h-[60vh] overflow-y-auto -mx-2">
              {data.calls.map((call) => (
                <li key={call.id}>
                  <Link
                    href={call.lead ? `/leads/${call.lead.id}` : "#"}
                    onClick={onClose}
                    className={cn(
                      "flex items-start gap-3 px-2 py-3 rounded-lg transition-colors",
                      call.lead ? "hover:bg-surface-50 cursor-pointer" : "cursor-default pointer-events-none opacity-70",
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 mt-0.5">
                      {call.callDirection === "INCOMING" ? (
                        <PhoneIncoming size={14} />
                      ) : call.callDirection === "OUTGOING" ? (
                        <PhoneOutgoing size={14} />
                      ) : (
                        <Phone size={14} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {call.lead?.name || call.lead?.phone || "Unknown lead"}
                        </span>
                        <span
                          className="text-xs text-gray-400 shrink-0"
                          title={dayjs(call.createdAt).format("D MMM YYYY, h:mm A")}
                        >
                          {dayjs(call.createdAt).fromNow()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{formatDuration(call.callDurationSecs)}</span>
                        {call.note && (
                          <span className="text-xs text-gray-400 truncate">— {call.note}</span>
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
