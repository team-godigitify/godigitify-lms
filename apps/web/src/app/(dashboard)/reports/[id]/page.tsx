"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Role } from "@lms/types";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/Button";
import { STATUS_CONFIG } from "@/config/leadStatus";
import { formatRupees } from "@/lib/format";
import type { LeadStatus } from "@lms/types";
import api from "@/lib/api";
import toast from "react-hot-toast";

type ReportDef = {
  id: string;
  name: string;
  filters: { type: string; period: string; branchId: string | null };
};

type EmployeeRow = {
  employee: { id: string; name: string; email: string };
  metrics: { totalAssigned: number; confirmed: number; confirmationRate: number; performanceScore: number };
};
type ConfirmedLead = {
  id: string; name: string | null; phone: string; dealValue: number;
  servicesSold: string[]; assignedTo: { name: string } | null; confirmedAt: string | null;
};
type PipelineRow = { status: string; count: number; avgDaysInStage: number | null };
type SourceRow = { source: { id: string; name: string }; total: number; confirmed: number; lost: number; conversionRate: number };

async function downloadExport(type: string, format: "csv" | "pdf", period: string, branchId: string | null) {
  try {
    const params = new URLSearchParams({ period });
    if (branchId) params.set("branchId", branchId);
    const response = await api.get(`/analytics/export/${format}/${type}?${params}`, { responseType: "blob" });
    const blob = new Blob([response.data as BlobPart]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-report.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Export failed");
  }
}

function ReportViewerContent({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", id, "run"],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: { report: ReportDef; result: unknown } }>(
        `/reports/${id}/run`,
      );
      return data.data;
    },
  });

  const report = data?.report;
  const type = report?.filters.type;

  return (
    <div className="space-y-5 max-w-4xl">
      <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary">
        <ArrowLeft size={14} /> Reports
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{report?.name ?? "Report"}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{report?.filters.period}</p>
        </div>
        {report && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void downloadExport(type!, "csv", report.filters.period, report.filters.branchId)}
            >
              <Download size={13} /> CSV
            </Button>
            {(type === "employees" || type === "confirmed") && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void downloadExport(type!, "pdf", report.filters.period, report.filters.branchId)}
              >
                <Download size={13} /> PDF
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-surface-200 rounded-xl p-5">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-surface-100 rounded animate-pulse" />
            ))}
          </div>
        ) : type === "employees" ? (
          <EmployeesResult rows={(data!.result as { employees: EmployeeRow[] }).employees} />
        ) : type === "confirmed" ? (
          <ConfirmedResult rows={(data!.result as { leads: ConfirmedLead[] }).leads} />
        ) : type === "pipeline" ? (
          <PipelineResult rows={(data!.result as { statusBreakdown: PipelineRow[] }).statusBreakdown} />
        ) : type === "sources" ? (
          <SourcesResult rows={(data!.result as { sources: SourceRow[] }).sources} />
        ) : (
          <p className="text-sm text-gray-400">Unknown report type</p>
        )}
      </div>
    </div>
  );
}

function EmployeesResult({ rows }: { rows: EmployeeRow[] }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-gray-400">No data</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-surface-100 text-left text-xs text-gray-400">
          <th className="pb-2">Employee</th><th className="pb-2 text-right">Assigned</th>
          <th className="pb-2 text-right">Clients</th><th className="pb-2 text-right">Conv %</th>
          <th className="pb-2 text-right">Score</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-50">
        {rows.map((r) => (
          <tr key={r.employee.id}>
            <td className="py-2 font-medium text-gray-700">{r.employee.name}</td>
            <td className="py-2 text-right text-gray-600">{r.metrics.totalAssigned}</td>
            <td className="py-2 text-right text-green-600 font-semibold">{r.metrics.confirmed}</td>
            <td className="py-2 text-right text-gray-600">{r.metrics.confirmationRate}%</td>
            <td className="py-2 text-right font-semibold text-gray-800">{r.metrics.performanceScore}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ConfirmedResult({ rows }: { rows: ConfirmedLead[] }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-gray-400">No data</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-surface-100 text-left text-xs text-gray-400">
          <th className="pb-2">Client</th><th className="pb-2">Closed By</th>
          <th className="pb-2 text-right">Deal Value</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-50">
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="py-2 font-medium text-gray-700">{r.name ?? r.phone}</td>
            <td className="py-2 text-gray-600">{r.assignedTo?.name ?? "—"}</td>
            <td className="py-2 text-right font-semibold text-green-600">{formatRupees(r.dealValue)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PipelineResult({ rows }: { rows: PipelineRow[] }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-gray-400">No data</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-surface-100 text-left text-xs text-gray-400">
          <th className="pb-2">Status</th><th className="pb-2 text-right">Count</th>
          <th className="pb-2 text-right">Avg Days</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-50">
        {rows.map((r) => (
          <tr key={r.status}>
            <td className="py-2 font-medium text-gray-700">
              {STATUS_CONFIG[r.status as LeadStatus]?.label ?? r.status}
            </td>
            <td className="py-2 text-right text-gray-600">{r.count}</td>
            <td className="py-2 text-right text-gray-600">{r.avgDaysInStage ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SourcesResult({ rows }: { rows: SourceRow[] }) {
  if (rows.length === 0) return <p className="py-8 text-center text-sm text-gray-400">No data</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-surface-100 text-left text-xs text-gray-400">
          <th className="pb-2">Source</th><th className="pb-2 text-right">Leads</th>
          <th className="pb-2 text-right">Clients</th><th className="pb-2 text-right">Conv %</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-50">
        {rows.map((r) => (
          <tr key={r.source.id}>
            <td className="py-2 font-medium text-gray-700">{r.source.name}</td>
            <td className="py-2 text-right text-gray-600">{r.total}</td>
            <td className="py-2 text-right text-green-600 font-semibold">{r.confirmed}</td>
            <td className="py-2 text-right text-gray-600">{r.conversionRate}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ReportViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGuard allowedRoles={[Role.ADMIN, Role.SUB_ADMIN]}>
      <ReportViewerContent id={id} />
    </AuthGuard>
  );
}
