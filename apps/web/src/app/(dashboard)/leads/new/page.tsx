"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import axios from "axios";
import api from "@/lib/api";
import { useNotifications } from "@/store/notifications";
import { useQuery } from "@tanstack/react-query";
import { extractApiError } from "@/lib/utils";
import { LeadPriority } from "@lms/types";

const INDUSTRIES = [
  "E-commerce",
  "Real Estate",
  "Education",
  "Healthcare",
  "Restaurant / Food",
  "Fashion & Apparel",
  "Beauty & Wellness",
  "Travel & Hospitality",
  "Finance & Insurance",
  "Technology / SaaS",
  "Manufacturing",
  "Retail",
  "NGO / Non-profit",
  "Other",
];

export default function NewLeadPage() {
  const router = useRouter();
  const { success, error } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState<{
    existingLeadId: string;
    message: string;
  } | null>(null);
  const [revivalModal, setRevivalModal] = useState<{
    lostLeadId: string;
    message: string;
  } | null>(null);

  const [form, setForm] = useState({
    phone: "",
    name: "",
    email: "",
    instagramUrl: "",
    websiteUrl: "",
    industry: "",
    leadPriority: "",
    dealSizeEstimate: "",
    city: "",
    sourceId: "",
    sourceOther: "",
    remarks: "",
    nextFollowUpAt: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateLead, setDuplicateLead] = useState<{
    id: string;
    name: string | null;
    phone: string;
    status: string;
  } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  const phoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current);
    if (!form.phone.match(/^[6-9]\d{9}$/)) {
      setDuplicateLead(null);
      setCheckingDuplicate(false);
      return;
    }
    setCheckingDuplicate(true);
    phoneTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/leads/check-duplicate?phone=${form.phone}`);
        const leads = data?.data?.leads as
          | Array<{ id: string; name: string | null; phone: string; status: string; isDuplicate: boolean }>
          | undefined;
        const match = leads?.find((l) => !l.isDuplicate) ?? leads?.[0];
        if (match) {
          setDuplicateLead({ id: match.id, name: match.name, phone: match.phone, status: match.status });
        } else {
          setDuplicateLead(null);
        }
      } catch {
        setDuplicateLead(null);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 400);
  }, [form.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: sources } = useQuery({
    queryKey: ["lead-sources"],
    queryFn: async () => {
      const { data } = await api.get("/settings/sources");
      return data.data as Array<{ id: string; name: string }>;
    },
  });

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.phone.match(/^[6-9]\d{9}$/))
      errs["phone"] = "Enter valid 10-digit Indian mobile number (starts with 6–9)";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs["email"] = "Enter a valid email address";
    if (form.nextFollowUpAt && new Date(form.nextFollowUpAt) <= new Date())
      errs["nextFollowUpAt"] = "Follow-up must be scheduled in the future";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent, revivalConfirm?: boolean) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const isProfileComplete = !!(form.instagramUrl && form.websiteUrl);
      const payload: Record<string, unknown> = {
        phone: form.phone,
        isProfileComplete,
      };
      if (form.name) payload["name"] = form.name;
      if (form.email) payload["email"] = form.email;
      if (form.instagramUrl) payload["instagramUrl"] = form.instagramUrl;
      if (form.websiteUrl) payload["websiteUrl"] = form.websiteUrl;
      if (form.industry) payload["industry"] = form.industry;
      if (form.leadPriority) payload["leadPriority"] = form.leadPriority;
      if (form.dealSizeEstimate) payload["dealSizeEstimate"] = Number(form.dealSizeEstimate);
      if (form.city) payload["city"] = form.city;
      if (form.sourceId) payload["sourceId"] = form.sourceId;
      if (form.sourceOther) payload["sourceOther"] = form.sourceOther;
      if (form.remarks) payload["remarks"] = form.remarks;
      if (form.nextFollowUpAt) payload["nextFollowUpAt"] = new Date(form.nextFollowUpAt).toISOString();
      if (revivalConfirm) payload["confirmRevival"] = true;

      const { data } = await api.post("/leads", payload);
      const result = data.data;

      if (result.requiresAction === "DUPLICATE_REDIRECTED") {
        setDuplicateModal({ existingLeadId: result.existingLeadId, message: result.message });
        return;
      }
      if (result.requiresAction === "REVIVAL_CONFIRMATION") {
        setRevivalModal({ lostLeadId: result.lostLeadId, message: result.message });
        return;
      }

      success("Lead created successfully");
      router.push(`/leads/${result.lead.id}`);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const details = e.response?.data?.details as Record<string, string[]> | undefined;
        if (details) {
          const nextErrors: Record<string, string> = {};
          const entries = Object.entries(details);
          entries.forEach(([field, messages]) => { if (messages[0]) nextErrors[field] = messages[0]; });
          if (Object.keys(nextErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...nextErrors }));
            return;
          }
        }
      }
      error("Failed to create lead", extractApiError(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleRevivalConfirm() {
    setRevivalModal(null);
    await handleSubmit({ preventDefault: () => {} } as React.FormEvent, true);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Add New Lead</h1>
        <p className="text-sm text-gray-500 mt-1">Enter the prospect&apos;s details</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {/* Phone + duplicate gate */}
        <div className="bg-white border border-surface-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</p>

          <div className="space-y-2">
            <Input
              label="Mobile Number"
              required
              type="tel"
              placeholder="e.g. 9876543210"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
              error={errors["phone"]}
              helperText={!errors["phone"] ? "10-digit Indian number" : undefined}
              maxLength={10}
              inputMode="numeric"
            />
            {checkingDuplicate && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 size={12} className="animate-spin" />
                Checking for duplicates…
              </div>
            )}
          </div>

          {duplicateLead ? (
            <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-700">Duplicate Number Detected</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    This mobile number is already in the system.
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-red-200 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <UserCheck size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {duplicateLead.name ?? duplicateLead.phone}
                  </p>
                  <p className="text-xs text-gray-400">
                    {duplicateLead.phone} · {duplicateLead.status.replace(/_/g, " ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/leads/${duplicateLead.id}`)}
                  className="shrink-0 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-800 transition-colors"
                >
                  Open Lead →
                </button>
              </div>
              <p className="text-xs text-red-500 text-center">
                Change the mobile number above to create a new lead.
              </p>
            </div>
          ) : (
            <>
              <Input
                label="Contact Name"
                placeholder="Business owner / contact person"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="contact@business.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value.trim())}
                error={errors["email"]}
              />
              <Input
                label="City"
                placeholder="e.g. Chandigarh"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </>
          )}
        </div>

        {!duplicateLead && (
          <>
            {/* Digital Presence */}
            <div className="bg-white border border-surface-200 rounded-xl p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Digital Presence
              </p>
              <Input
                label="Instagram Profile URL"
                placeholder="https://instagram.com/business"
                value={form.instagramUrl}
                onChange={(e) => set("instagramUrl", e.target.value.trim())}
              />
              <Input
                label="Website URL"
                placeholder="https://business.com"
                value={form.websiteUrl}
                onChange={(e) => set("websiteUrl", e.target.value.trim())}
              />
              {form.instagramUrl && form.websiteUrl ? (
                <p className="text-xs text-green-600 font-medium">✓ Profile will be marked complete</p>
              ) : (
                <p className="text-xs text-amber-600">Both URLs needed for a complete profile</p>
              )}
            </div>

            {/* Business Details */}
            <div className="bg-white border border-surface-200 rounded-xl p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Business Details
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Industry / Niche
                </label>
                <select
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                  aria-label="Industry"
                  title="Industry"
                  className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white"
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Lead Priority
                  </label>
                  <select
                    value={form.leadPriority}
                    onChange={(e) => set("leadPriority", e.target.value)}
                    aria-label="Lead priority"
                    title="Lead priority"
                    className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white"
                  >
                    <option value="">Select priority</option>
                    <option value={LeadPriority.HIGH}>High</option>
                    <option value={LeadPriority.MEDIUM}>Medium</option>
                    <option value={LeadPriority.LOW}>Low</option>
                  </select>
                </div>
                <Input
                  label="Deal Size Estimate (₹)"
                  type="number"
                  placeholder="e.g. 25000"
                  value={form.dealSizeEstimate}
                  onChange={(e) => set("dealSizeEstimate", e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Lead Source
                </label>
                <select
                  value={form.sourceId}
                  onChange={(e) => set("sourceId", e.target.value)}
                  aria-label="Lead source"
                  title="Lead source"
                  className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white"
                >
                  <option value="">Select source</option>
                  {sources?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {form.sourceId && sources?.find((s) => s.id === form.sourceId)?.name === "Others" && (
                <Input
                  label="Specify Source"
                  placeholder="Describe the source"
                  value={form.sourceOther}
                  onChange={(e) => set("sourceOther", e.target.value)}
                />
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Remarks
                </label>
                <textarea
                  value={form.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                  placeholder="Internal notes..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white resize-none"
                />
              </div>
            </div>

            {/* Follow-up */}
            <div className="bg-white border border-surface-200 rounded-xl p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Follow-up</p>
              <Input
                label="Next Follow-up Date"
                type="datetime-local"
                value={form.nextFollowUpAt}
                onChange={(e) => set("nextFollowUpAt", e.target.value)}
                min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                error={errors["nextFollowUpAt"]}
                helperText={!errors["nextFollowUpAt"] ? "Must be a future date & time" : undefined}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                Create Lead
              </Button>
            </div>
          </>
        )}
      </form>

      <Modal
        open={!!duplicateModal}
        onClose={() => setDuplicateModal(null)}
        title="Duplicate Lead Detected"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDuplicateModal(null)}>Close</Button>
            <Button onClick={() => router.push(`/leads/${duplicateModal?.existingLeadId}`)}>
              View Existing Lead
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">{duplicateModal?.message}</p>
        <p className="text-sm text-gray-500 mt-2">
          The new enquiry has been added to the existing lead&apos;s timeline.
        </p>
      </Modal>

      <Modal
        open={!!revivalModal}
        onClose={() => setRevivalModal(null)}
        title="Previously Lost Lead"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRevivalModal(null)}>No, Cancel</Button>
            <Button onClick={() => void handleRevivalConfirm()}>Yes, Continue Follow-up</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">{revivalModal?.message}</p>
      </Modal>
    </div>
  );
}
