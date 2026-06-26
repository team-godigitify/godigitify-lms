"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";
import { ArrowLeft, User, Clock, Pencil, ExternalLink, Link2, Globe, AlertCircle, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import { useLeadDetail, useLeadInteractions } from "@/hooks/useLeadDetail";
import { InteractionTimeline } from "@/components/leads/InteractionTimeline";
import { AddInteractionForm } from "@/components/leads/AddInteractionForm";
import { ClientDealForm } from "@/components/leads/ClientDealForm";
import { IntelBriefPanel } from "@/components/leads/IntelBriefPanel";
import { LeadSidebar } from "@/components/leads/LeadSidebar";
import { StatusBadge } from "@/components/leads/StatusBadge";
import { LeadPriority, LeadStatus, Role } from "@lms/types";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const PRIORITY_LABELS: Record<string, string> = {
  [LeadPriority.HIGH]: "High",
  [LeadPriority.MEDIUM]: "Medium",
  [LeadPriority.LOW]: "Low",
};


export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [dealFormOpen, setDealFormOpen] = useState(false);

  const { data: lead, isLoading } = useLeadDetail(id);
  const { data: interactionData } = useLeadInteractions(id);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-surface-200 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-32 bg-surface-200 rounded-xl" />
            <div className="h-64 bg-surface-200 rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="h-40 bg-surface-200 rounded-xl" />
            <div className="h-32 bg-surface-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Lead not found</p>
        <Link href="/leads" className="text-primary text-sm mt-2 block hover:underline">
          Back to leads
        </Link>
      </div>
    );
  }

  const displayName = (lead as any).name ?? lead.phone;
  const canManageDeal =
    user?.role === Role.ADMIN || user?.role === Role.SUB_ADMIN;
  const showDealSection =
    canManageDeal &&
    (lead.status === LeadStatus.PROPOSAL_SENT ||
      lead.status === LeadStatus.CLIENT ||
      lead.status === LeadStatus.NEGOTIATING);

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft size={14} />
          Back to leads
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
              <StatusBadge status={lead.status} />
              {lead.isDuplicate && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  Duplicate
                </span>
              )}
              {!(lead as any).isProfileComplete && (
                <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                  <AlertCircle size={10} />
                  Profile incomplete
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <User size={11} />
                Added by {lead.createdBy.name}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock size={11} />
                {dayjs(lead.createdAt).format("D MMM YYYY")}
              </span>
            </div>
          </div>

          <Link
            href={`/leads/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors"
          >
            <Pencil size={13} /> Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Lead Profile */}
          <div className="bg-white border border-surface-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Lead Profile
            </p>
            <div className="space-y-3">
              {/* Social/web links */}
              <div className="grid grid-cols-1 gap-3">
                {(lead as any).instagramUrl ? (
                  <a
                    href={(lead as any).instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-pink-600 hover:underline"
                  >
                    <Link2 size={14} />
                    {(lead as any).instagramUrl}
                    <ExternalLink size={11} className="text-gray-400" />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Link2 size={14} />
                    No Instagram URL
                  </div>
                )}
                {(lead as any).websiteUrl ? (
                  <a
                    href={(lead as any).websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Globe size={14} />
                    {(lead as any).websiteUrl}
                    <ExternalLink size={11} className="text-gray-400" />
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Globe size={14} />
                    No website URL
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                {(lead as any).isProfileComplete ? (
                  <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={11} />
                    Profile complete
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                    <AlertCircle size={11} />
                    Profile incomplete — missing URLs
                  </span>
                )}
              </div>

              {/* Other fields */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2 border-t border-surface-100">
                {[
                  { label: "Industry / Niche", value: (lead as any).industry },
                  {
                    label: "Priority",
                    value: (lead as any).leadPriority
                      ? PRIORITY_LABELS[(lead as any).leadPriority] ?? (lead as any).leadPriority
                      : null,
                  },
                  {
                    label: "Deal Size Estimate",
                    value: (lead as any).dealSizeEstimate
                      ? `₹${Number((lead as any).dealSizeEstimate).toLocaleString("en-IN")}`
                      : null,
                  },
                  { label: "City", value: (lead as any).city },
                  { label: "Email", value: lead.email },
                ]
                  .filter((f) => f.value)
                  .map((field) => (
                    <div key={field.label}>
                      <p className="text-xs text-gray-400">{field.label}</p>
                      <p className="text-sm text-gray-700 font-medium mt-0.5">
                        {String(field.value)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Intel Brief panel */}
          <div className="bg-white border border-surface-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-primary-600" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Intel Brief
              </p>
            </div>
            <IntelBriefPanel
              leadId={id}
              isProfileComplete={!!(lead as any).isProfileComplete}
              canManage={canManageDeal}
            />
          </div>

          {/* Client Deal panel */}
          {showDealSection && (
            <div id="client-deal-section" className="bg-white border border-purple-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setDealFormOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                    Client Deal
                  </p>
                  {(lead as any).clientDeal && (
                    <span className="text-sm font-bold text-purple-700">
                      · ₹{Number((lead as any).clientDeal.dealValue).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-purple-400 transition-transform",
                    dealFormOpen && "rotate-180",
                  )}
                />
              </button>

              {(lead as any).clientDeal && !dealFormOpen && (
                <div className="px-5 pb-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-purple-100">
                  {[
                    {
                      label: "Deal Value",
                      value: `₹${Number((lead as any).clientDeal.dealValue).toLocaleString("en-IN")}`,
                      bold: true,
                    },
                    {
                      label: "Contract Start",
                      value: dayjs((lead as any).clientDeal.contractStartDate).format("D MMM YYYY"),
                    },
                    {
                      label: "Services",
                      value: ((lead as any).clientDeal.servicesSold as string[]).join(", "),
                    },
                    ...(
                      (lead as any).clientDeal.quotationLink
                        ? [{ label: "Quotation", value: (lead as any).clientDeal.quotationLink as string, isLink: true }]
                        : []
                    ),
                  ].map((f) => (
                    <div key={f.label} className="pt-3">
                      <p className="text-xs text-gray-400">{f.label}</p>
                      {(f as any).isLink ? (
                        <a
                          href={f.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline font-medium mt-0.5 block truncate"
                        >
                          View document
                        </a>
                      ) : (
                        <p className={cn("text-sm mt-0.5", (f as any).bold ? "font-bold text-purple-700 text-base" : "text-gray-700 font-medium")}>
                          {f.value}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {dealFormOpen && (
                <div className="px-5 pb-5 border-t border-purple-100 pt-4">
                  <ClientDealForm
                    leadId={id}
                    existing={(lead as any).clientDeal}
                    onSuccess={() => setDealFormOpen(false)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Read-only deal display for non-managers */}
          {!showDealSection && (lead as any).clientDeal && (
            <div className="bg-white border border-purple-200 rounded-xl p-5 space-y-3">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Client Deal</p>
              <div>
                <p className="text-xs text-gray-400">Deal Value</p>
                <p className="text-lg font-bold text-purple-700">
                  ₹{Number((lead as any).clientDeal.dealValue).toLocaleString("en-IN")}
                </p>
              </div>
              {((lead as any).clientDeal.servicesSold as string[]).length > 0 && (
                <div>
                  <p className="text-xs text-gray-400">Services</p>
                  <p className="text-sm text-gray-700 font-medium">
                    {((lead as any).clientDeal.servicesSold as string[]).join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* WhatsApp panel */}
          {(lead as any).isFromWhatsApp && (
            <div className="bg-white border border-green-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-700">WhatsApp Lead</p>
              </div>

              {(lead as any).waFirstMessage && (
                <div>
                  <p className="text-xs text-gray-400">First Message</p>
                  <p className="text-sm text-gray-700 font-medium mt-0.5 bg-green-50 rounded-lg px-3 py-2 border border-green-100">
                    &ldquo;{(lead as any).waFirstMessage}&rdquo;
                  </p>
                </div>
              )}

              <a
                href={`https://wa.me/91${lead.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors"
              >
                <ExternalLink size={12} />
                Reply on WhatsApp
              </a>
            </div>
          )}

          <AddInteractionForm leadId={id} />

          <div className="bg-white border border-surface-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-5">
              Activity Timeline
            </p>
            <InteractionTimeline
              interactions={interactionData?.interactions ?? []}
              leadId={id}
              remarks={lead.remarks}
            />
          </div>
        </div>

        <div>
          <LeadSidebar
            lead={lead}
            onOpenClientDeal={() => {
              setDealFormOpen(true);
              setTimeout(() => {
                document.getElementById("client-deal-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 50);
            }}
          />
        </div>
      </div>
    </div>
  );
}
