"use client";

import { useIntelBrief, useGenerateIntelBrief } from "@/hooks/useLeadDetail";
import type { IntelBriefItem, IntelBriefGap } from "@lms/types";
import { cn } from "@/lib/utils";
import { Sparkles, RefreshCw, CheckCircle, AlertCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Props = {
  leadId: string;
  isProfileComplete: boolean;
  canManage?: boolean;
};

const PRIORITY_STYLE: Record<string, string> = {
  P1: "bg-red-50 text-red-700 border border-red-200",
  P2: "bg-amber-50 text-amber-700 border border-amber-200",
  P3: "bg-slate-50 text-slate-600 border border-slate-200",
};

const PRIORITY_LABEL: Record<string, string> = {
  P1: "High",
  P2: "Medium",
  P3: "Low",
};

function ItemCard({ item, badge }: { item: IntelBriefItem; badge?: React.ReactNode }) {
  if (item.confidence_score < 50) return null;
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-slate-800 text-sm">{item.finding}</span>
        {badge}
      </div>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{item.evidence}</p>
    </div>
  );
}

function Section({ title, children, accent }: {
  title: string;
  children: React.ReactNode;
  accent: string;
}) {
  return (
    <div>
      <h4 className={cn("mb-2 text-xs font-semibold uppercase tracking-wider", accent)}>{title}</h4>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export function IntelBriefPanel({ leadId, isProfileComplete, canManage }: Props) {
  const { data: brief, isLoading } = useIntelBrief(leadId);
  const generate = useGenerateIntelBrief(leadId);

  if (!isProfileComplete) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <Sparkles className="mx-auto mb-2 h-6 w-6 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">Intel Brief unavailable</p>
        <p className="mt-1 text-xs text-slate-400">Add Instagram URL and Website URL to unlock AI-generated prospect intelligence.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <Clock className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <Sparkles className="mx-auto mb-2 h-6 w-6 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">No Intel Brief generated yet</p>
        {canManage && (
          <Button
            type="button"
            size="sm"
            className="mt-3"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? "Queuing…" : "Generate Brief"}
          </Button>
        )}
      </div>
    );
  }

  if (brief.status === "PENDING") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-700">
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
        Generating Intel Brief… this takes about 10–30 seconds.
      </div>
    );
  }

  if (brief.status === "FAILED") {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-700 text-sm font-medium">
          <XCircle className="h-4 w-4 shrink-0" />
          Intel Brief generation failed after 3 attempts.
        </div>
        {canManage && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? "Retrying…" : "Retry"}
          </Button>
        )}
      </div>
    );
  }

  if (brief.status === "NEEDS_REVIEW" || !brief.validatedOutput) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Brief needs review — output could not be validated.
        </div>
        {canManage && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
          >
            {generate.isPending ? "Retrying…" : "Retry"}
          </Button>
        )}
      </div>
    );
  }

  const { strengths, gaps, awkward_moments, executive_summary, email_hook, recommended_next_action } = brief.validatedOutput;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
          <CheckCircle className="h-4 w-4" />
          Intel Brief ready
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", generate.isPending && "animate-spin")} />
            Regenerate
          </button>
        )}
      </div>

      {executive_summary && (
        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed">
          {executive_summary}
        </p>
      )}

      <Section title="Strengths" accent="text-emerald-600">
        {strengths.map((item, i) => (
          <ItemCard key={i} item={item} />
        ))}
      </Section>

      <Section title="Gaps & Opportunities" accent="text-primary-700">
        {gaps.map((gap, i) => (
          <ItemCard
            key={i}
            item={gap}
            badge={
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", PRIORITY_STYLE[(gap as IntelBriefGap).priority])}>
                {PRIORITY_LABEL[(gap as IntelBriefGap).priority] ?? (gap as IntelBriefGap).priority}
              </span>
            }
          />
        ))}
      </Section>

      <Section title="Watch Out For" accent="text-amber-600">
        {awkward_moments.map((item, i) => (
          <ItemCard key={i} item={item} />
        ))}
      </Section>

      {email_hook && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider mb-1">Email Hook</p>
          <p className="text-xs text-indigo-700 leading-relaxed">{email_hook}</p>
        </div>
      )}

      {recommended_next_action && (
        <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
          <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider mb-1">Recommended Next Action</p>
          <p className="text-xs text-purple-700 leading-relaxed">{recommended_next_action}</p>
        </div>
      )}

      <p className="text-[10px] text-slate-300 text-right">
        {brief.aiModelUsed} · {new Date(brief.updatedAt).toLocaleDateString("en-IN")}
      </p>
    </div>
  );
}
