"use client";

import { useState } from "react";
import { Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Role } from "@lms/types";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatRupees } from "@/lib/format";
import api from "@/lib/api";
import { useNotifications } from "@/store/notifications";
import { extractApiError } from "@/lib/utils";

type LeadSource = { id: string; name: string; isActive: boolean };
type Campaign = {
  id: string;
  name: string;
  sourceId: string;
  spend: string | null;
  startDate: string;
  isActive: boolean;
  source: { id: string; name: string };
  _count: { leads: number };
};

const emptyForm = { name: "", sourceId: "", spend: "", startDate: new Date().toISOString().slice(0, 10) };

function CampaignsSettingsContent() {
  const qc = useQueryClient();
  const { success, error } = useNotifications();
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data } = await api.get("/campaigns");
      return data.data.campaigns as Campaign[];
    },
  });

  const { data: sources } = useQuery<LeadSource[]>({
    queryKey: ["lead-sources"],
    queryFn: async () => {
      const { data } = await api.get("/settings/sources");
      return data.data as LeadSource[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async () => {
      await api.post("/campaigns", {
        name: form.name,
        sourceId: form.sourceId,
        spend: form.spend ? Number(form.spend) : undefined,
        startDate: new Date(form.startDate).toISOString(),
      });
    },
    onSuccess: () => {
      success("Campaign created");
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
      void qc.invalidateQueries({ queryKey: ["analytics", "campaigns"] });
      setAddModal(false);
      setForm(emptyForm);
    },
    onError: (e) => error("Failed", extractApiError(e)),
  });

  const toggleCampaign = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/campaigns/${id}`, { isActive });
    },
    onSuccess: () => {
      success("Updated");
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e) => error("Failed", extractApiError(e)),
  });

  const canSubmit = form.name.trim() && form.sourceId && form.startDate;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track named marketing pushes within a lead source for ROI reporting
          </p>
        </div>
        <Button onClick={() => setAddModal(true)}>
          <Plus size={15} />
          Add Campaign
        </Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                {["Campaign", "Source", "Spend", "Leads", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {(campaigns ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{c.source.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.spend ? formatRupees(Number(c.spend)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c._count.leads}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive ? "success" : "gray"}>
                      {c.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void toggleCampaign.mutateAsync({ id: c.id, isActive: !c.isActive })}
                      className="text-gray-400 hover:text-primary transition-colors"
                      aria-label="Toggle campaign active"
                    >
                      {c.isActive ? (
                        <ToggleRight size={20} className="text-primary" />
                      ) : (
                        <ToggleLeft size={20} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {(campaigns ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    No campaigns yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Add Campaign"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void createCampaign.mutateAsync()}
              loading={createCampaign.isPending}
              disabled={!canSubmit}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Campaign Name"
            required
            placeholder="e.g. July Meta Ads Push"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Lead Source <span className="text-red-500">*</span>
            </label>
            <select
              value={form.sourceId}
              onChange={(e) => setForm((f) => ({ ...f, sourceId: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm bg-white"
            >
              <option value="">Select source</option>
              {(sources ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Spend (₹, optional)"
            type="number"
            placeholder="Ad spend for ROI calculation"
            value={form.spend}
            onChange={(e) => setForm((f) => ({ ...f, spend: e.target.value }))}
          />
          <Input
            label="Start Date"
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}

export default function CampaignsSettingsPage() {
  return (
    <AuthGuard allowedRoles={[Role.ADMIN, Role.SUB_ADMIN]}>
      <CampaignsSettingsContent />
    </AuthGuard>
  );
}
