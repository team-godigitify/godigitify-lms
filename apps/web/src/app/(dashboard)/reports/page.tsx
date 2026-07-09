"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, FileText, Mail } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Role } from "@lms/types";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuthStore } from "@/store/auth";
import { useBranches } from "@/hooks/useBranches";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";
import toast from "react-hot-toast";

type ReportDef = {
  id: string;
  name: string;
  filters: { type: string; period: string; branchId: string | null };
  createdAt: string;
};

const REPORT_TYPE_LABEL: Record<string, string> = {
  employees: "Employee Performance",
  confirmed: "Client Deals / Revenue",
  pipeline: "Pipeline Snapshot",
  sources: "Source Performance",
};

function ReportsPageContent() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === Role.ADMIN;
  const qc = useQueryClient();
  const { data: branches } = useBranches();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data } = await api.get<{ success: true; data: { reports: ReportDef[] } }>("/reports");
      return data.data.reports;
    },
  });

  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: "employees", period: "last30", branchId: "" });
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Name your report");
      return;
    }
    setSaving(true);
    try {
      await api.post("/reports", {
        name: form.name.trim(),
        type: form.type,
        period: form.period,
        branchId: form.branchId || undefined,
      });
      toast.success("Report saved");
      setAddModal(false);
      setForm({ name: "", type: "employees", period: "last30", branchId: "" });
      void qc.invalidateQueries({ queryKey: ["reports"] });
    } catch {
      toast.error("Failed to save report");
    } finally {
      setSaving(false);
    }
  }

  const deleteReport = useMutation({
    mutationFn: async (id: string) => api.delete(`/reports/${id}`),
    onSuccess: () => {
      toast.success("Report deleted");
      void qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: () => toast.error("Failed to delete report"),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Saved filter sets you can re-run and export any time
          </p>
        </div>
        <Button onClick={() => setAddModal(true)}>
          <Plus size={15} /> New Report
        </Button>
      </div>

      {/* Built-in daily digest — already runs as an email cron; surfaced here
          per PRD §9 rather than being email-only and invisible in-app. */}
      <div className="bg-white border border-surface-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
          <Mail size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Daily Digest</p>
          <p className="text-xs text-gray-500">
            Automatic daily email summary of today&apos;s calls, leads, and conversions — sent to every active employee and manager. Not editable here.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !reports || reports.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No saved reports yet</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 p-4 bg-white border border-surface-200 rounded-xl hover:border-primary-200 transition-colors"
            >
              <Link href={`/reports/${r.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 bg-surface-100 rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{r.name}</p>
                  <p className="text-xs text-gray-500">
                    {REPORT_TYPE_LABEL[r.filters.type] ?? r.filters.type} · {r.filters.period}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => void deleteReport.mutateAsync(r.id)}
                className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition-colors shrink-0"
                aria-label="Delete report"
                title="Delete report"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="New Report"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button onClick={() => void handleCreate()} loading={saving}>Save Report</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Report Name"
            required
            placeholder="e.g. Monthly Employee Review"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Report Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm bg-white"
            >
              {Object.entries(REPORT_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Period</label>
            <select
              value={form.period}
              onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm bg-white"
            >
              <option value="today">Today</option>
              <option value="week">7 days</option>
              <option value="last30">30 days</option>
              <option value="last90">90 days</option>
            </select>
          </div>
          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Branch (optional)</label>
              <select
                value={form.branchId}
                onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm bg-white"
              >
                <option value="">All branches</option>
                {((branches as Array<{ id: string; name: string }> | undefined) ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AuthGuard allowedRoles={[Role.ADMIN, Role.SUB_ADMIN]}>
      <ReportsPageContent />
    </AuthGuard>
  );
}
