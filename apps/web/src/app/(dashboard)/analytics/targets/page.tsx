"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Phone, Users2, CalendarClock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Role, TargetScope, TargetMetric } from "@lms/types";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/hooks/useBranches";
import { useEmployeeList } from "@/hooks/useLeads";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TargetInteractionsModal } from "@/components/dashboard/TargetInteractionsModal";
import { formatRupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import toast from "react-hot-toast";

// "YYYY-MM" -> the calendar-month date bounds the leads list understands.
// Plain local date math (no toISOString/UTC conversion) to stay consistent
// with how the backend's own parsePeriod() reads the same string.
function monthRange(period: string): { dateFrom: string; dateTo: string } {
  const [y, m] = period.split("-").map(Number);
  const lastDay = new Date(y ?? 1970, m ?? 1, 0).getDate();
  return { dateFrom: `${period}-01`, dateTo: `${period}-${String(lastDay).padStart(2, "0")}` };
}

type TargetRow = {
  id: string;
  scope: TargetScope;
  scopeId: string | null;
  metric: TargetMetric;
  period: string;
  value: string;
};

type TargetStatus = "upcoming" | "in_progress" | "completed" | "partial" | "missed";

type TargetHistoryRow = TargetRow & {
  progress: {
    achieved: number;
    target: number;
    percent: number;
    status: TargetStatus;
    breakdown: { leads: number; calls: number; meetings: number; conversions: number; revenue: number };
  };
};

const METRIC_LABEL: Record<string, string> = {
  REVENUE: "Revenue",
  LEADS: "Leads",
  CONVERSIONS: "Conversions",
};

const STATUS_CONFIG: Record<
  TargetStatus,
  { label: string; badge: "success" | "warning" | "danger" | "info" | "gray"; bar: string }
> = {
  completed: { label: "Completed", badge: "success", bar: "bg-green-500" },
  partial: { label: "Partially Completed", badge: "warning", bar: "bg-amber-400" },
  missed: { label: "Missed", badge: "danger", bar: "bg-red-400" },
  in_progress: { label: "In Progress", badge: "info", bar: "bg-blue-500" },
  upcoming: { label: "Upcoming", badge: "gray", bar: "bg-surface-300" },
};

function useTargetHistory() {
  return useQuery({
    queryKey: ["targets", "history"],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: { history: TargetHistoryRow[] } }>(
        "/targets/history",
      );
      return data.data.history;
    },
    staleTime: 60_000,
  });
}

// Target setting + attainment scope, per PRD §14: ADMIN sets any scope,
// SUB_ADMIN only their own branch/employees, EMPLOYEE has no write access
// (this page is hidden from them entirely — see the /analytics layout guard).
export default function TargetsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === Role.ADMIN;
  const qc = useQueryClient();

  const { data: history, isLoading } = useTargetHistory();
  const { data: branches } = useBranches();
  const { data: employees } = useEmployeeList();

  const branchMap = useMemo(
    () => new Map(((branches as Array<{ id: string; name: string }> | undefined) ?? []).map((b) => [b.id, b.name])),
    [branches],
  );
  const employeeMap = useMemo(
    () => new Map((employees ?? []).map((e) => [e.id, e.name])),
    [employees],
  );

  const [form, setForm] = useState({
    scope: TargetScope.EMPLOYEE as string,
    scopeId: "",
    metric: TargetMetric.REVENUE as string,
    period: new Date().toISOString().slice(0, 7),
    value: "",
  });
  const [saving, setSaving] = useState(false);

  const [interactionsModal, setInteractionsModal] = useState<{
    targetId: string;
    type: "CALL" | "MEETING";
    title: string;
    showUser: boolean;
  } | null>(null);

  function scopeLabel(row: TargetRow): string {
    if (row.scope === TargetScope.COMPANY) return "Company-wide";
    if (row.scope === TargetScope.BRANCH) return branchMap.get(row.scopeId ?? "") ?? "Branch";
    return employeeMap.get(row.scopeId ?? "") ?? "Employee";
  }

  // Same scope + createdAt-in-period filter the "leads" breakdown count
  // used (getTargetProgress's leadsCount) — allStatuses bypasses the leads
  // list's organic-browsing default so the total always matches the chip.
  function leadsHref(row: TargetRow): string {
    const { dateFrom, dateTo } = monthRange(row.period);
    const params = new URLSearchParams({ allStatuses: "true", dateFrom, dateTo });
    if (row.scope === TargetScope.EMPLOYEE && row.scopeId) params.set("assignedToId", row.scopeId);
    if (row.scope === TargetScope.BRANCH && row.scopeId) params.set("branchId", row.scopeId);
    return `/leads?${params}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.scope !== TargetScope.COMPANY && !form.scopeId) {
      toast.error("Select a branch or employee");
      return;
    }
    if (!form.value || Number(form.value) <= 0) {
      toast.error("Enter a target value greater than zero");
      return;
    }
    setSaving(true);
    try {
      await api.post("/targets", {
        scope: form.scope,
        scopeId: form.scope === TargetScope.COMPANY ? undefined : form.scopeId,
        metric: form.metric,
        period: form.period,
        value: Number(form.value),
      });
      toast.success("Target saved");
      setForm((f) => ({ ...f, scopeId: "", value: "" }));
      void qc.invalidateQueries({ queryKey: ["targets"] });
    } catch {
      toast.error("Failed to save target");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/targets/${id}`);
      toast.success("Target removed");
      void qc.invalidateQueries({ queryKey: ["targets"] });
    } catch {
      toast.error("Failed to remove target");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <form onSubmit={(e) => void handleSubmit(e)} className="bg-white border border-surface-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Set a Target</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Scope</label>
            <select
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value, scopeId: "" }))}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white"
            >
              {isAdmin && <option value={TargetScope.COMPANY}>Company-wide</option>}
              <option value={TargetScope.BRANCH}>Branch</option>
              <option value={TargetScope.EMPLOYEE}>Employee</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Metric</label>
            <select
              value={form.metric}
              onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white"
            >
              <option value={TargetMetric.REVENUE}>Revenue</option>
              <option value={TargetMetric.LEADS}>Leads</option>
              <option value={TargetMetric.CONVERSIONS}>Conversions</option>
            </select>
          </div>

          {form.scope === TargetScope.BRANCH && (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Branch</label>
              <select
                value={form.scopeId}
                onChange={(e) => setForm((f) => ({ ...f, scopeId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white"
              >
                <option value="">Select branch</option>
                {((branches as Array<{ id: string; name: string }> | undefined) ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {form.scope === TargetScope.EMPLOYEE && (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Employee</label>
              <select
                value={form.scopeId}
                onChange={(e) => setForm((f) => ({ ...f, scopeId: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white"
              >
                <option value="">Select employee</option>
                {(employees ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Period (month)</label>
            <input
              type="month"
              value={form.period}
              onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Target Value</label>
            <input
              type="number"
              min="1"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              placeholder={form.metric === TargetMetric.REVENUE ? "e.g. 500000" : "e.g. 50"}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white"
            />
          </div>
        </div>
        <Button type="submit" loading={saving}>
          <Plus size={14} /> Save Target
        </Button>
      </form>

      <div className="bg-white border border-surface-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Target History</h3>
        <p className="text-xs text-gray-400 mb-4">
          Every target set, whether it was hit, and the leads/calls/meetings behind the number
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-surface-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !history || history.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No targets set yet</p>
        ) : (
          <div className="space-y-3">
            {history.map((t) => {
              const status = STATUS_CONFIG[t.progress.status];
              const barPercent = Math.min(100, Math.max(0, t.progress.percent));
              const isRevenue = t.metric === TargetMetric.REVENUE;

              return (
                <div key={t.id} className="border border-surface-100 rounded-xl p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{scopeLabel(t)}</p>
                      <p className="text-xs text-gray-400">
                        {METRIC_LABEL[t.metric] ?? t.metric} · {t.period}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={status.badge}>{status.label}</Badge>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(t.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                          aria-label="Delete target"
                          title="Delete target"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mb-1 gap-2">
                    <span className="text-sm font-bold text-gray-800">
                      {isRevenue ? formatRupees(t.progress.achieved) : t.progress.achieved}
                    </span>
                    <span className="text-xs text-gray-400">
                      of {isRevenue ? formatRupees(t.progress.target) : t.progress.target} ({t.progress.percent}%)
                    </span>
                  </div>
                  <div className="bg-surface-100 rounded-full h-2 mb-3">
                    <div
                      className={cn("h-2 rounded-full transition-all", status.bar)}
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={leadsHref(t)}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 bg-surface-50 border border-surface-100 rounded-lg px-2 py-1 hover:border-primary/30 hover:text-primary transition-colors"
                    >
                      <Users2 size={12} className="text-violet-500" />
                      {t.progress.breakdown.leads} leads
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        setInteractionsModal({
                          targetId: t.id,
                          type: "CALL",
                          title: `Calls — ${scopeLabel(t)} (${t.period})`,
                          showUser: t.scope !== TargetScope.EMPLOYEE,
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs text-gray-500 bg-surface-50 border border-surface-100 rounded-lg px-2 py-1 hover:border-primary/30 hover:text-primary transition-colors"
                    >
                      <Phone size={12} className="text-cyan-600" />
                      {t.progress.breakdown.calls} calls
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setInteractionsModal({
                          targetId: t.id,
                          type: "MEETING",
                          title: `Meetings — ${scopeLabel(t)} (${t.period})`,
                          showUser: t.scope !== TargetScope.EMPLOYEE,
                        })
                      }
                      className="inline-flex items-center gap-1 text-xs text-gray-500 bg-surface-50 border border-surface-100 rounded-lg px-2 py-1 hover:border-primary/30 hover:text-primary transition-colors"
                    >
                      <CalendarClock size={12} className="text-orange-500" />
                      {t.progress.breakdown.meetings} meetings
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {interactionsModal && (
        <TargetInteractionsModal
          open={!!interactionsModal}
          onClose={() => setInteractionsModal(null)}
          targetId={interactionsModal.targetId}
          type={interactionsModal.type}
          title={interactionsModal.title}
          showUser={interactionsModal.showUser}
        />
      )}
    </div>
  );
}
