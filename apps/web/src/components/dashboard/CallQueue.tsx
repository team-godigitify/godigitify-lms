"use client";

import Link from "next/link";
import { Phone, AlertCircle, Flame, CalendarClock } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useMyFollowUps, useLeadsAtRisk } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

dayjs.extend(relativeTime);

type QueueReason = "overdue" | "hot" | "today";

type QueueRow = {
  id: string;
  name: string | null;
  phone: string;
  reason: QueueReason;
  detail: string;
};

const REASON_STYLE: Record<QueueReason, { icon: typeof AlertCircle; label: string; className: string }> = {
  overdue: { icon: AlertCircle, label: "Overdue", className: "border-red-200 bg-red-50 text-red-600" },
  hot: { icon: Flame, label: "Hot lead", className: "border-orange-200 bg-orange-50 text-orange-600" },
  today: { icon: CalendarClock, label: "Due today", className: "border-amber-100 bg-amber-50 text-amber-600" },
};

// "Who should I call first" — merges overdue follow-ups (oldest first), hot
// leads (high score, gone quiet 48h+) and today's scheduled follow-ups into
// one ranked list, each row tagged with *why* it's here.
export function CallQueue() {
  const { data: followUps, isLoading: followUpsLoading } = useMyFollowUps();
  const { data: atRisk, isLoading: atRiskLoading } = useLeadsAtRisk({ staleDays: 2 });

  const isLoading = followUpsLoading || atRiskLoading;

  type FollowUpLead = { id: string; name: string | null; phone: string; nextFollowUpAt: string | null };
  const overdue = ((followUps as { overdue?: FollowUpLead[] } | undefined)?.overdue ?? []);
  const upcoming = ((followUps as { upcoming?: FollowUpLead[] } | undefined)?.upcoming ?? []);
  const todayStr = dayjs().format("YYYY-MM-DD");
  const dueToday = upcoming.filter((l) => l.nextFollowUpAt && dayjs(l.nextFollowUpAt).format("YYYY-MM-DD") === todayStr);

  const overdueIds = new Set(overdue.map((l) => l.id));
  const hotLeads = (atRisk?.leads ?? []).filter(
    (l) => !overdueIds.has(l.id) && typeof l.leadScore === "number" && l.leadScore >= 70,
  );

  const rows: QueueRow[] = [
    ...overdue.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      reason: "overdue" as const,
      detail: l.nextFollowUpAt ? `Overdue ${dayjs(l.nextFollowUpAt).fromNow(true)}` : "Overdue",
    })),
    ...hotLeads.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      reason: "hot" as const,
      detail: `Score ${l.leadScore} · gone quiet`,
    })),
    ...dueToday
      .filter((l) => !overdueIds.has(l.id))
      .map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        reason: "today" as const,
        detail: l.nextFollowUpAt ? `Due ${dayjs(l.nextFollowUpAt).fromNow()}` : "Due today",
      })),
  ].slice(0, 8);

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Who to Call First</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-surface-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          Nothing urgent right now — great work!
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const style = REASON_STYLE[row.reason];
            const Icon = style.icon;
            return (
              <Link
                key={`${row.reason}-${row.id}`}
                href={`/leads/${row.id}`}
                className={cn(
                  "flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors hover:bg-surface-50",
                  style.className,
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon size={12} />
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {row.name ?? row.phone}
                    </p>
                  </div>
                  <p className="text-xs mt-0.5">{row.detail}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof window !== "undefined") window.location.href = `tel:${row.phone}`;
                  }}
                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors shrink-0"
                  aria-label={`Call ${row.name ?? row.phone}`}
                  title={`Call ${row.name ?? row.phone}`}
                >
                  <Phone size={13} />
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
