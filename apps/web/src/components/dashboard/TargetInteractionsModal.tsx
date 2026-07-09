"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Phone, PhoneIncoming, PhoneOutgoing, Users, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
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

type InteractionEntry = {
  id: string;
  note: string | null;
  createdAt: string;
  callDurationSecs: number | null;
  callDirection: string | null;
  callRecordingUrl: string | null;
  user: { id: string; name: string } | null;
  lead: { id: string; name: string | null; phone: string } | null;
};
type InteractionsResponse = {
  items: InteractionEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function useTargetInteractions(targetId: string, type: "CALL" | "MEETING", page: number, enabled: boolean) {
  return useQuery({
    queryKey: ["targets", "interactions", targetId, type, page],
    queryFn: async () => {
      const params = new URLSearchParams({ type, page: String(page), pageSize: "20" });
      const { data } = await api.get<{ success: true; data: InteractionsResponse }>(
        `/targets/${targetId}/interactions?${params}`,
      );
      return data.data;
    },
    enabled: enabled && !!targetId,
    staleTime: 30_000,
  });
}

type Props = {
  open: boolean;
  onClose: () => void;
  targetId: string;
  type: "CALL" | "MEETING";
  title: string;
  /** True when the target spans more than one person (BRANCH/COMPANY scope) — shows who made each call/meeting. */
  showUser?: boolean;
};

// Lists the individual CALL/MEETING interactions behind a target's
// breakdown chip (see getTargetInteractions) — same scope/period filter the
// chip's count came from, so the list total always matches. Each row links
// straight to its lead.
export function TargetInteractionsModal({ open, onClose, targetId, type, title, showUser }: Props) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) setPage(1);
  }, [open, targetId, type]);

  const { data, isLoading } = useTargetInteractions(targetId, type, page, open);
  const Icon = type === "CALL" ? Phone : Users;

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            None logged in this period.
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-500">{data.total} total</p>
            <ul className="divide-y divide-surface-100 max-h-[60vh] overflow-y-auto -mx-2">
              {data.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.lead ? `/leads/${item.lead.id}` : "#"}
                    onClick={onClose}
                    className={cn(
                      "flex items-start gap-3 px-2 py-3 rounded-lg transition-colors",
                      item.lead ? "hover:bg-surface-50 cursor-pointer" : "cursor-default pointer-events-none opacity-70",
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 mt-0.5">
                      {type === "CALL" ? (
                        item.callDirection === "INCOMING" ? (
                          <PhoneIncoming size={14} />
                        ) : item.callDirection === "OUTGOING" ? (
                          <PhoneOutgoing size={14} />
                        ) : (
                          <Icon size={14} />
                        )
                      ) : (
                        <Icon size={14} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {item.lead?.name || item.lead?.phone || "Unknown lead"}
                        </span>
                        <span
                          className="text-xs text-gray-400 shrink-0"
                          title={dayjs(item.createdAt).format("D MMM YYYY, h:mm A")}
                        >
                          {dayjs(item.createdAt).fromNow()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {type === "CALL" && (
                          <span className="text-xs text-gray-500">{formatDuration(item.callDurationSecs)}</span>
                        )}
                        {showUser && item.user && (
                          <span className="text-xs text-gray-400">{item.user.name}</span>
                        )}
                        {item.note && (
                          <span className="text-xs text-gray-400 truncate">— {item.note}</span>
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
