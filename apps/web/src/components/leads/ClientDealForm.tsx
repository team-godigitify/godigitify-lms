"use client";

import { useState } from "react";
import { X, Plus, Handshake } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useUpsertClientDeal } from "@/hooks/useLeadDetail";
import { cn } from "@/lib/utils";

const SERVICES = [
  "Meta Ads",
  "Google Ads",
  "SEO",
  "Social Media Management",
  "Content Creation",
  "Website Development",
  "Email Marketing",
  "WhatsApp Marketing",
  "Influencer Marketing",
  "Brand Strategy",
  "Video Production",
  "Graphic Design",
];

type Props = {
  leadId: string;
  existing?: {
    dealValue: number;
    servicesSold: string[];
    contractStartDate: string | Date;
    quotationLink?: string | null;
  } | null;
  onSuccess?: () => void;
};

export function ClientDealForm({ leadId, existing, onSuccess }: Props) {
  const [dealValue, setDealValue] = useState(
    existing ? String(existing.dealValue) : "",
  );
  const [selectedServices, setSelectedServices] = useState<string[]>(
    existing?.servicesSold ?? [],
  );
  const [customService, setCustomService] = useState("");
  const [contractStartDate, setContractStartDate] = useState(
    existing?.contractStartDate
      ? new Date(existing.contractStartDate).toISOString().slice(0, 10)
      : "",
  );
  const [quotationLink, setQuotationLink] = useState(
    existing?.quotationLink ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const upsert = useUpsertClientDeal(leadId);

  function toggleService(s: string) {
    setSelectedServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
    setErrors((prev) => { const n = { ...prev }; delete n["servicesSold"]; return n; });
  }

  function addCustom() {
    const trimmed = customService.trim();
    if (!trimmed || selectedServices.includes(trimmed)) return;
    setSelectedServices((prev) => [...prev, trimmed]);
    setCustomService("");
  }

  function removeService(s: string) {
    setSelectedServices((prev) => prev.filter((x) => x !== s));
  }

  function validate() {
    const errs: Record<string, string> = {};
    const val = Number(dealValue);
    if (!dealValue || isNaN(val) || val <= 0) errs["dealValue"] = "Enter a valid deal value greater than 0";
    if (selectedServices.length === 0) errs["servicesSold"] = "Select at least one service";
    if (!contractStartDate) errs["contractStartDate"] = "Contract start date is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    await upsert.mutateAsync({
      dealValue: Number(dealValue),
      servicesSold: selectedServices,
      contractStartDate,
      ...(quotationLink.trim() && { quotationLink: quotationLink.trim() }),
    });

    onSuccess?.();
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            label="Deal Value (₹)"
            required
            type="number"
            placeholder="e.g. 50000"
            value={dealValue}
            onChange={(e) => {
              setDealValue(e.target.value);
              setErrors((prev) => { const n = { ...prev }; delete n["dealValue"]; return n; });
            }}
            error={errors["dealValue"]}
            inputMode="numeric"
          />
        </div>
        <div>
          <Input
            label="Contract Start Date"
            required
            type="date"
            value={contractStartDate}
            onChange={(e) => {
              setContractStartDate(e.target.value);
              setErrors((prev) => { const n = { ...prev }; delete n["contractStartDate"]; return n; });
            }}
            error={errors["contractStartDate"]}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Services Sold <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {SERVICES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleService(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                selectedServices.includes(s)
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-600 border-surface-200 hover:border-primary",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Custom service input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customService}
            onChange={(e) => setCustomService(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            placeholder="Add custom service..."
            className="flex-1 px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customService.trim()}
            className="px-3 py-2 rounded-lg border border-surface-200 text-sm text-gray-600 hover:border-primary hover:text-primary disabled:opacity-40 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Selected services tags */}
        {selectedServices.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {selectedServices.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 text-primary text-xs font-medium border border-primary-200"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeService(s)}
                  className="text-primary hover:text-red-500 transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        {errors["servicesSold"] && (
          <p className="text-xs text-red-500 mt-1">{errors["servicesSold"]}</p>
        )}
      </div>

      <Input
        label="Quotation / Proposal Link"
        type="url"
        placeholder="https://drive.google.com/..."
        value={quotationLink}
        onChange={(e) => setQuotationLink(e.target.value.trim())}
        helperText="Google Drive, Notion, or any shareable link"
      />

      <Button type="submit" loading={upsert.isPending} className="w-full">
        <Handshake size={15} />
        {existing ? "Update Client Deal" : "Save Client Deal"}
      </Button>
    </form>
  );
}
