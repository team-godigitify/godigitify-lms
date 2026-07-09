"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Users,
  TrendingUp,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  BarChart2,
  MessageSquare,
} from "lucide-react";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { EmployeeActivityChart } from "@/components/dashboard/EmployeeActivityChart";
import { CallLogModal } from "@/components/dashboard/CallLogModal";
import { LeadsInteractedModal } from "@/components/dashboard/LeadsInteractedModal";
import { cn } from "@/lib/utils";
import { periodToDateRange } from "@/lib/period";
import type { Period } from "@/hooks/useDashboard";

type DayActivity = {
  date: string;
  interactions: number;
  calls: number;
  minutes: number;
};

export type EmployeeDetail = {
  employee: { id: string; name: string; email: string };
  metrics: {
    performanceScore: number;
    totalAssigned: number;
    confirmed: number;
    lost: number;
    active: number;
    revenueClosed?: number;
    confirmationRate: number;
    avgResponseHours: number | null;
    overdueFollowUps: number;
    followUpComplianceRate: number;
    callCount: number;
    callMinutes: number;
    leadsInteracted: number;
    dailyActivity: DayActivity[];
  };
};

function ScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? "#16a34a" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 72 72" className="w-20 h-20 -rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-800">{score}</span>
        <span className="text-[9px] text-gray-400 leading-none">score</span>
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  href?: string;
  onClick?: () => void;
  tooltip?: string;
};

function StatCard({ label, value, icon, color, href, onClick, tooltip }: StatCardProps) {
  const clickable = !!href || !!onClick;
  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border bg-white transition-all",
        clickable ? "hover:shadow-md hover:border-primary/30 cursor-pointer" : "cursor-default",
        "border-surface-200",
      )}
      title={tooltip}
    >
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", color)}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-800">{value}</p>
      </div>
      {clickable && (
        <div className="ml-auto">
          <ArrowLeft size={13} className="text-gray-300 rotate-180" />
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="text-left w-full">
        {inner}
      </button>
    );
  }
  return inner;
}

function ComplianceBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? "bg-green-500" : rate >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-surface-100 rounded-full h-2">
        <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-700 shrink-0 w-10 text-right">{rate}%</span>
    </div>
  );
}

type Props = {
  data: EmployeeDetail | undefined;
  isLoading: boolean;
  period: Period;
  onPeriodChange: (p: Period) => void;
  backHref: string;
  backLabel: string;
  /** True on the employee's own /my-performance view — routes the call log
   * through /analytics/me/calls (no role guard) instead of the admin-only
   * /analytics/employees/:id/calls. */
  isSelf?: boolean;
};

// Shared performance view — used both by the manager-facing employee detail
// page (/analytics/employees/[id]) and the employee's own self-view
// (/my-performance). Same data shape (getEmployeePerformance), same UI;
// only the data source and the "back" link differ between callers.
export function EmployeePerformanceView({
  data,
  isLoading,
  period,
  onPeriodChange,
  backHref,
  backLabel,
  isSelf = false,
}: Props) {
  const [callsOpen, setCallsOpen] = useState(false);
  const [leadsOpen, setLeadsOpen] = useState(false);
  const emp = data?.employee;
  const m = data?.metrics;
  const initials = emp?.name?.slice(0, 2).toUpperCase() ?? "??";

  // Every metric card's count comes from leads *created* in this period
  // (see getEmployeePerformance's allLeads query) — the drill-down link must
  // carry the same dateFrom/dateTo or its total silently answers a different
  // question ("leads ever assigned" vs. "leads assigned in this period").
  const { dateFrom, dateTo } = periodToDateRange(period);
  const periodParam = dateFrom ? `&dateFrom=${dateFrom}&dateTo=${dateTo}` : "";

  return (
    <div className="space-y-5 max-w-5xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        {backLabel}
      </Link>

      {/* Header */}
      <div className="bg-white border border-surface-200 rounded-xl p-5 flex flex-wrap items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary font-bold text-xl shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-5 w-40 bg-surface-100 rounded animate-pulse" />
              <div className="h-3 w-56 bg-surface-100 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 truncate">{emp?.name ?? "—"}</h1>
              <p className="text-sm text-gray-500 truncate">{emp?.email}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0 w-full justify-between sm:w-auto sm:justify-start">
          {!isLoading && m && <ScoreRing score={m.performanceScore} />}
          <PeriodSelector value={period} onChange={onPeriodChange} />
        </div>
      </div>

      {/* Metric cards — each links to filtered leads */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : m && emp ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Leads"
            value={m.totalAssigned}
            icon={<Users size={16} className="text-blue-600" />}
            color="bg-blue-50"
            href={`/leads?assignedToId=${emp.id}&allStatuses=true${periodParam}`}
            tooltip="View all leads assigned to this employee"
          />
          <StatCard
            label="Clients Closed"
            value={m.confirmed}
            icon={<Star size={16} className="text-green-600" />}
            color="bg-green-50"
            href={`/leads?assignedToId=${emp.id}&status=CLIENT${periodParam}`}
            tooltip="View leads converted to clients"
          />
          <StatCard
            label="Lost Leads"
            value={m.lost}
            icon={<AlertTriangle size={16} className="text-red-500" />}
            color="bg-red-50"
            href={`/leads?assignedToId=${emp.id}&status=LOST${periodParam}`}
            tooltip="View lost leads"
          />
          <StatCard
            label="Active Leads"
            value={m.active}
            icon={<Activity size={16} className="text-indigo-600" />}
            color="bg-indigo-50"
            href={`/leads?assignedToId=${emp.id}&excludeStatus=CLIENT,DUPLICATE,LOST${periodParam}`}
            tooltip="View active leads"
          />
          <StatCard
            label="Conv. Rate"
            value={`${m.confirmationRate}%`}
            icon={<TrendingUp size={16} className="text-violet-600" />}
            color="bg-violet-50"
          />
          <StatCard
            label="Overdue F/U"
            value={m.overdueFollowUps}
            icon={<Clock size={16} className="text-amber-600" />}
            color="bg-amber-50"
            href={`/leads?assignedToId=${emp.id}&overdue=true`}
            tooltip="View leads with overdue follow-ups"
          />
          <StatCard
            label="Total Calls"
            value={m.callCount}
            icon={<Phone size={16} className="text-cyan-600" />}
            color="bg-cyan-50"
            onClick={() => setCallsOpen(true)}
            tooltip="View the individual calls behind this count"
          />
          <StatCard
            label="Leads Touched"
            value={m.leadsInteracted}
            icon={<MessageSquare size={16} className="text-pink-600" />}
            color="bg-pink-50"
            onClick={() => setLeadsOpen(true)}
            tooltip="View the individual leads behind this count"
          />
        </div>
      ) : null}

      {/* Activity chart + Compliance */}
      {!isLoading && m && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-surface-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-gray-800">7-Day Activity</h3>
            </div>
            <EmployeeActivityChart data={m.dailyActivity} />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>{m.callCount} total calls</span>
              <span>{m.callMinutes} min talked</span>
            </div>
          </div>

          <div className="bg-white border border-surface-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-gray-800">Follow-up Compliance</h3>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Compliance rate</span>
                <span
                  className={cn(
                    "font-semibold",
                    m.followUpComplianceRate >= 80
                      ? "text-green-600"
                      : m.followUpComplianceRate >= 50
                        ? "text-amber-600"
                        : "text-red-500",
                  )}
                >
                  {m.followUpComplianceRate >= 80
                    ? "Good"
                    : m.followUpComplianceRate >= 50
                      ? "Needs improvement"
                      : "Poor"}
                </span>
              </div>
              <ComplianceBar rate={m.followUpComplianceRate} />
            </div>

            <div className="pt-2 border-t border-surface-100 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Avg. first response</span>
                <span className="font-semibold text-gray-800">
                  {m.avgResponseHours !== null ? `${m.avgResponseHours.toFixed(1)}h` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Overdue follow-ups</span>
                <Link
                  href={`/leads?assignedToId=${emp?.id}&overdue=true`}
                  className={cn(
                    "font-semibold hover:underline",
                    m.overdueFollowUps > 0 ? "text-red-500" : "text-green-600",
                  )}
                >
                  {m.overdueFollowUps}
                  {m.overdueFollowUps > 0 ? " overdue" : " — all clear"}
                </Link>
              </div>
              {typeof m.revenueClosed === "number" && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Revenue closed</span>
                  <span className="font-semibold text-gray-800">
                    ₹{m.revenueClosed.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Performance score</span>
                <span
                  className={cn(
                    "font-bold",
                    m.performanceScore >= 70
                      ? "text-green-600"
                      : m.performanceScore >= 40
                        ? "text-amber-600"
                        : "text-red-500",
                  )}
                >
                  {m.performanceScore} / 100
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick links */}
      {emp && (
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Quick Filters — Lead View</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "All Leads", href: `/leads?assignedToId=${emp.id}`, color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
              { label: "Clients", href: `/leads?assignedToId=${emp.id}&status=CLIENT`, color: "bg-green-50 text-green-700 hover:bg-green-100" },
              { label: "Negotiating", href: `/leads?assignedToId=${emp.id}&status=NEGOTIATING`, color: "bg-violet-50 text-violet-700 hover:bg-violet-100" },
              { label: "Interested", href: `/leads?assignedToId=${emp.id}&status=INTERESTED`, color: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100" },
              { label: "Proposal Sent", href: `/leads?assignedToId=${emp.id}&status=PROPOSAL_SENT`, color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" },
              { label: "Lost", href: `/leads?assignedToId=${emp.id}&status=LOST`, color: "bg-red-50 text-red-700 hover:bg-red-100" },
              { label: "Overdue F/U", href: `/leads?assignedToId=${emp.id}&overdue=true`, color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
              { label: "New Leads", href: `/leads?assignedToId=${emp.id}&status=NEW`, color: "bg-slate-50 text-slate-700 hover:bg-slate-100" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                  link.color,
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {emp && (
        <>
          <CallLogModal
            open={callsOpen}
            onClose={() => setCallsOpen(false)}
            employeeId={isSelf ? undefined : emp.id}
            employeeName={emp.name}
            period={period}
          />
          <LeadsInteractedModal
            open={leadsOpen}
            onClose={() => setLeadsOpen(false)}
            employeeId={isSelf ? undefined : emp.id}
            employeeName={emp.name}
            period={period}
          />
        </>
      )}
    </div>
  );
}
