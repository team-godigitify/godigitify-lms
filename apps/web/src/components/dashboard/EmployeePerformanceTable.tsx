"use client";

import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useEmployeePerformance } from "@/hooks/useDashboard";
import { useAnalyticsFilters } from "@/context/AnalyticsFilterContext";
import { EmployeeActivityChart } from "./EmployeeActivityChart";
import { CallLogModal } from "./CallLogModal";
import { LeadsInteractedModal } from "./LeadsInteractedModal";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Phone, Clock, Users, AlertCircle, CheckCircle2 } from "lucide-react";

type DayActivity = {
  date: string;
  interactions: number;
  calls: number;
  minutes: number;
};

type EmployeeRow = {
  employee: { id: string; name: string };
  metrics: {
    performanceScore: number;
    totalAssigned: number;
    confirmed: number;
    lost: number;
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

function StatMini({
  icon: Icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon size={13} />
      </div>
      <div>
        <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-800 leading-none">{value}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="flex items-center gap-2 bg-white border border-surface-100 rounded-lg px-3 py-2 min-w-27.5 hover:border-primary/30 hover:shadow-sm transition-all"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-surface-100 rounded-lg px-3 py-2 min-w-27.5">
      {content}
    </div>
  );
}

function ExpandedRow({
  emp,
  onOpenCalls,
  onOpenLeadsInteracted,
  onOpenOverdue,
}: {
  emp: EmployeeRow;
  onOpenCalls: (employee: { id: string; name: string }) => void;
  onOpenLeadsInteracted: (employee: { id: string; name: string }) => void;
  onOpenOverdue: (employeeId: string) => void;
}) {
  const m = emp.metrics;

  return (
    <tr>
      <td colSpan={9} className="bg-surface-50 border-b border-surface-100 px-4 pb-4 pt-2">
        <div className="flex flex-wrap gap-2 mb-3">
          <StatMini icon={Phone}        label="Calls Made"       value={m.callCount ?? 0}               color="bg-blue-50 text-blue-600" onClick={() => onOpenCalls(emp.employee)} />
          <StatMini icon={Clock}        label="Call Minutes"     value={`${m.callMinutes ?? 0}m`}       color="bg-orange-50 text-orange-500" onClick={() => onOpenCalls(emp.employee)} />
          <StatMini icon={Users}        label="Leads Interacted" value={m.leadsInteracted ?? 0}         color="bg-violet-50 text-violet-600" onClick={() => onOpenLeadsInteracted(emp.employee)} />
          <StatMini icon={CheckCircle2} label="Follow-up %"      value={`${m.followUpComplianceRate}%`} color="bg-teal-50 text-teal-600" onClick={() => onOpenOverdue(emp.employee.id)} />
          <StatMini icon={AlertCircle}  label="Overdue"          value={m.overdueFollowUps}             color="bg-red-50 text-red-500" onClick={() => onOpenOverdue(emp.employee.id)} />
        </div>

        <div className="bg-white border border-surface-100 rounded-lg p-2">
          <p className="text-xs text-gray-400 font-medium mb-1 px-1">7-day activity</p>
          <EmployeeActivityChart data={m.dailyActivity} />
        </div>
      </td>
    </tr>
  );
}

export function EmployeePerformanceTable() {
  const router = useRouter();
  const { period, branchId } = useAnalyticsFilters();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [callsEmployee, setCallsEmployee] = useState<{ id: string; name: string } | null>(null);
  const [leadsEmployee, setLeadsEmployee] = useState<{ id: string; name: string } | null>(null);
  const { data, isLoading } = useEmployeePerformance(period, branchId);

  function openOverdue(employeeId: string) {
    router.push(`/leads?assignedToId=${employeeId}&overdue=true`);
  }

  const employees: EmployeeRow[] = Array.isArray(
    (data as { employees?: unknown })?.employees,
  )
    ? ((data as { employees?: EmployeeRow[] }).employees ?? [])
    : [];

  const headers = ["Employee", "Leads", "Clients", "Lost", "Calls", "Mins", "Interacted", "Conv %"];

  return (
    <div className="bg-white border border-surface-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Employee Performance</h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-100 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="pb-2 w-6"><span className="sr-only">Expand</span></th>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pr-4"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const isExpanded = expandedId === emp.employee.id;

                return (
                  <Fragment key={emp.employee.id}>
                    <tr
                      className="border-b border-surface-50 hover:bg-surface-50 cursor-pointer transition-colors"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : emp.employee.id)
                      }
                    >
                      {/* expand toggle */}
                      <td className="py-2.5 pr-1">
                        {isExpanded
                          ? <ChevronDown size={13} className="text-gray-400" />
                          : <ChevronRight size={13} className="text-gray-400" />}
                      </td>
                      {/* name */}
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {emp.employee.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            {emp.employee.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-sm text-gray-600">{emp.metrics.totalAssigned}</td>
                      <td className="py-2.5 pr-4 text-sm font-semibold text-green-600">{emp.metrics.confirmed}</td>
                      <td className="py-2.5 pr-4 text-sm text-red-500">{emp.metrics.lost}</td>
                      <td className="py-2.5 pr-4 text-sm">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCallsEmployee(emp.employee);
                          }}
                          className="text-blue-600 font-medium hover:underline"
                        >
                          {emp.metrics.callCount ?? 0}
                        </button>
                      </td>
                      <td className="py-2.5 pr-4 text-sm">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCallsEmployee(emp.employee);
                          }}
                          className="text-orange-500 font-medium hover:underline"
                        >
                          {emp.metrics.callMinutes ?? 0}m
                        </button>
                      </td>
                      <td className="py-2.5 pr-4 text-sm">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLeadsEmployee(emp.employee);
                          }}
                          className="text-violet-600 font-medium hover:underline"
                        >
                          {emp.metrics.leadsInteracted ?? 0}
                        </button>
                      </td>
                      <td className="py-2.5 pr-4 text-sm font-semibold text-gray-700">{emp.metrics.confirmationRate}%</td>
                    </tr>
                    {isExpanded && (
                      <ExpandedRow
                        emp={emp}
                        onOpenCalls={setCallsEmployee}
                        onOpenLeadsInteracted={setLeadsEmployee}
                        onOpenOverdue={openOverdue}
                      />
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          {employees.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">
              No employee data for this period
            </p>
          )}
        </div>
      )}

      <CallLogModal
        open={!!callsEmployee}
        onClose={() => setCallsEmployee(null)}
        employeeId={callsEmployee?.id}
        employeeName={callsEmployee?.name}
        period={period}
      />
      <LeadsInteractedModal
        open={!!leadsEmployee}
        onClose={() => setLeadsEmployee(null)}
        employeeId={leadsEmployee?.id}
        employeeName={leadsEmployee?.name}
        period={period}
      />
    </div>
  );
}
