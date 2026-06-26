"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLeadDetail, useUpdateLead } from "@/hooks/useLeadDetail";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import toast from "react-hot-toast";
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

export default function EditLeadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: lead, isLoading } = useLeadDetail(id);
  const updateLead = useUpdateLead(id);

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

  const { data: sources } = useQuery({
    queryKey: ["lead-sources"],
    queryFn: async () => {
      const { data } = await api.get("/settings/sources");
      return data.data as Array<{ id: string; name: string }>;
    },
  });

  useEffect(() => {
    if (!lead) return;
    setForm({
      phone: lead.phone ?? "",
      name: (lead as any).name ?? "",
      email: lead.email ?? "",
      instagramUrl: (lead as any).instagramUrl ?? "",
      websiteUrl: (lead as any).websiteUrl ?? "",
      industry: (lead as any).industry ?? "",
      leadPriority: (lead as any).leadPriority ?? "",
      dealSizeEstimate: (lead as any).dealSizeEstimate ? String((lead as any).dealSizeEstimate) : "",
      city: (lead as any).city ?? "",
      sourceId: (lead as any).sourceId ?? "",
      sourceOther: (lead as any).sourceOther ?? "",
      remarks: (lead as any).remarks ?? "",
      nextFollowUpAt: lead.nextFollowUpAt
        ? new Date(lead.nextFollowUpAt as unknown as string).toISOString().slice(0, 16)
        : "",
    });
  }, [lead]);

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const n = { ...prev };
      delete n[field];
      return n;
    });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.phone.match(/^[6-9]\d{9}$/))
      errs["phone"] = "Enter valid 10-digit Indian number";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const payload: Record<string, unknown> = { phone: form.phone };
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
    if (form.nextFollowUpAt)
      payload["nextFollowUpAt"] = new Date(form.nextFollowUpAt).toISOString();

    // Recompute isProfileComplete
    payload["isProfileComplete"] = !!(form.instagramUrl && form.websiteUrl);

    try {
      await updateLead.mutateAsync(payload);
      toast.success("Lead updated");
      router.push(`/leads/${id}`);
    } catch {
      toast.error("Failed to update lead");
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-surface-200 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!lead)
    return <p className="text-center text-gray-400 py-20">Lead not found</p>;

  const displayName = (lead as any).name ?? lead.phone;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="text-xl font-bold text-gray-900">Edit Lead</h1>
        <p className="text-sm text-gray-500 mt-1">{displayName}</p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        {/* Basic */}
        <div className="bg-white border border-surface-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Basic Information
          </p>
          <Input
            label="Mobile Number"
            required
            placeholder="10-digit mobile number"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            error={errors["phone"]}
            maxLength={10}
            inputMode="numeric"
          />
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
            onChange={(e) => set("email", e.target.value)}
          />
          <Input
            label="City"
            placeholder="e.g. Chandigarh"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </div>

        {/* Social / Digital Presence */}
        <div className="bg-white border border-surface-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Digital Presence
          </p>
          <Input
            label="Instagram Profile URL"
            placeholder="https://instagram.com/business"
            value={form.instagramUrl}
            onChange={(e) => set("instagramUrl", e.target.value)}
          />
          <Input
            label="Website URL"
            placeholder="https://business.com"
            value={form.websiteUrl}
            onChange={(e) => set("websiteUrl", e.target.value)}
          />
          {form.instagramUrl && form.websiteUrl && (
            <p className="text-xs text-green-600 font-medium">✓ Profile will be marked complete</p>
          )}
          {(!form.instagramUrl || !form.websiteUrl) && (
            <p className="text-xs text-amber-600">Both URLs required for a complete profile</p>
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
        </div>

        {/* Source & Remarks */}
        <div className="bg-white border border-surface-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Source & Notes
          </p>
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
              placeholder="Internal notes about this lead..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary bg-white resize-none"
            />
          </div>
        </div>

        {/* Follow-up */}
        <div className="bg-white border border-surface-200 rounded-xl p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Follow-up
          </p>
          <Input
            label="Next Follow-up Date"
            type="datetime-local"
            value={form.nextFollowUpAt}
            onChange={(e) => set("nextFollowUpAt", e.target.value)}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={updateLead.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
