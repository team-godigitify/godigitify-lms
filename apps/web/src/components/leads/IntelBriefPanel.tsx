"use client";

import { useIntelBrief, useGenerateIntelBrief } from "@/hooks/useLeadDetail";
import type {
  IntelBriefItem,
  IntelBriefGap,
  IceBreaker,
  NegotiationAngle,
  LoopInHook,
  ProspectSnapshot,
  BrandAudit,
  BrandFoundationGap,
} from "@lms/types";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Users,
  Globe,
  Zap,
  MessageSquare,
  TrendingUp,
  RotateCcw,
  Copy,
  Check,
  Building2,
  Eye,
  Triangle,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useState, type ReactNode } from "react";

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

function formatFollowers(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-auto shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function SnapshotPanel({ snapshot }: { snapshot: ProspectSnapshot }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5" /> Prospect Snapshot
      </h4>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">
            {formatFollowers(snapshot.instagram_followers)}
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Followers</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">
            {formatFollowers(snapshot.instagram_following)}
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Following</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-800">
            {formatFollowers(snapshot.instagram_posts)}
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wide">Posts</p>
        </div>
      </div>
      {snapshot.instagram_bio && (
        <p className="text-xs text-slate-600 italic border-t border-slate-200 pt-2">
          &ldquo;{snapshot.instagram_bio}&rdquo;
        </p>
      )}
      {snapshot.instagram_engagement_quality && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Zap className="h-3 w-3 text-amber-400" />
          <span>Engagement: <strong className="text-slate-700">{snapshot.instagram_engagement_quality}</strong></span>
        </div>
      )}
      {snapshot.website_exists && snapshot.website_summary && (
        <div className="flex items-start gap-1.5 text-xs text-slate-500 border-t border-slate-200 pt-2">
          <Globe className="h-3 w-3 mt-0.5 shrink-0 text-blue-400" />
          <span>{snapshot.website_summary}</span>
        </div>
      )}
    </div>
  );
}

function IceBreakerCard({ item }: { item: IceBreaker }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
      <div className="flex items-start gap-2">
        <span className="text-sm font-medium text-slate-800">{item.topic}</span>
        <CopyButton text={item.opener} />
      </div>
      <blockquote className="text-xs text-indigo-700 bg-indigo-50 rounded px-2 py-1.5 border-l-2 border-indigo-300 leading-relaxed">
        &ldquo;{item.opener}&rdquo;
      </blockquote>
      <p className="text-[11px] text-slate-400 leading-relaxed">{item.why_it_works}</p>
    </div>
  );
}

function NegotiationCard({ item }: { item: NegotiationAngle }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
      <span className="text-sm font-medium text-slate-800">{item.angle}</span>
      <div className="flex items-start gap-2">
        <blockquote className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1.5 border-l-2 border-emerald-300 leading-relaxed flex-1">
          &ldquo;{item.script_line}&rdquo;
        </blockquote>
        <CopyButton text={item.script_line} />
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        <strong className="text-slate-500">When:</strong> {item.when_to_use}
      </p>
    </div>
  );
}

function LoopInCard({ item }: { item: LoopInHook }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <RotateCcw className="h-3 w-3" />
        <span>{item.trigger}</span>
      </div>
      <div className="flex items-start gap-2">
        <p className="text-xs text-purple-700 bg-purple-50 rounded px-2 py-1.5 leading-relaxed flex-1">
          {item.message_template}
        </p>
        <CopyButton text={item.message_template} />
      </div>
    </div>
  );
}

const MATURITY_COLOR: Record<string, string> = {
  "Early-stage": "text-red-600 bg-red-50 border-red-200",
  "Developing": "text-amber-600 bg-amber-50 border-amber-200",
  "Established": "text-blue-600 bg-blue-50 border-blue-200",
  "Strong": "text-emerald-600 bg-emerald-50 border-emerald-200",
};

const MATURITY_BAR: Record<string, string> = {
  "Early-stage": "bg-red-400",
  "Developing": "bg-amber-400",
  "Established": "bg-blue-500",
  "Strong": "bg-emerald-500",
};

const GAP_PRIORITY_STYLE: Record<string, string> = {
  "Critical": "bg-red-50 text-red-700 border border-red-200",
  "Important": "bg-amber-50 text-amber-700 border border-amber-200",
  "Nice-to-have": "bg-slate-50 text-slate-600 border border-slate-200",
};

const SIGNAL_PILL = (present: boolean) =>
  present
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
    : "bg-red-50 text-red-600 border border-red-200";

function BrandFoundationGapCard({ gap }: { gap: BrandFoundationGap }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="text-sm font-medium text-slate-800 flex-1">{gap.gap}</span>
        <div className="flex items-center gap-1 shrink-0">
          {gap.quick_win && (
            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase tracking-wide">
              Quick win
            </span>
          )}
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", GAP_PRIORITY_STYLE[gap.priority])}>
            {gap.priority}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">{gap.business_impact}</p>
    </div>
  );
}

function BrandAuditPanel({ audit }: { audit: BrandAudit }) {
  const { positioning, visibility, foundation_gaps, brand_maturity_score, brand_maturity_label, consulting_verdict } = audit;
  const barClass = MATURITY_BAR[brand_maturity_label] ?? "bg-slate-400";
  const labelClass = MATURITY_COLOR[brand_maturity_label] ?? "text-slate-600 bg-slate-50 border-slate-200";

  return (
    <div className="space-y-3">
      {/* Maturity score header */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Brand Maturity
          </h4>
          <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wide", labelClass)}>
            {brand_maturity_label}
          </span>
        </div>
        {/* Score bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5">
          <div
            className={cn("h-1.5 rounded-full transition-all", barClass)}
            style={{ width: `${Math.min(100, Math.max(0, brand_maturity_score))}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400">{brand_maturity_score}/100</p>
        {/* Consulting verdict */}
        <blockquote className="text-xs text-slate-600 bg-slate-50 rounded px-3 py-2 border-l-2 border-slate-300 leading-relaxed mt-1">
          {consulting_verdict}
        </blockquote>
      </div>

      {/* Positioning */}
      <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
        <h5 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Triangle className="h-3 w-3" /> Positioning
        </h5>
        {positioning.brand_promise && (
          <p className="text-xs text-slate-600 italic">&ldquo;{positioning.brand_promise}&rdquo;</p>
        )}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {positioning.target_audience_clarity && (
            <div>
              <span className="text-slate-400 block">Audience Clarity</span>
              <span className={cn(
                "font-medium",
                positioning.target_audience_clarity === "Clear" ? "text-emerald-600" :
                positioning.target_audience_clarity === "Vague" ? "text-amber-600" : "text-red-600"
              )}>{positioning.target_audience_clarity}</span>
            </div>
          )}
          {positioning.differentiation_score !== null && (
            <div>
              <span className="text-slate-400 block">Differentiation</span>
              <span className={cn(
                "font-medium",
                positioning.differentiation_score >= 65 ? "text-emerald-600" :
                positioning.differentiation_score >= 40 ? "text-amber-600" : "text-red-600"
              )}>{positioning.differentiation_score}/100</span>
            </div>
          )}
          {positioning.tone_consistency && (
            <div>
              <span className="text-slate-400 block">Tone Consistency</span>
              <span className={cn(
                "font-medium",
                positioning.tone_consistency === "Consistent" ? "text-emerald-600" :
                positioning.tone_consistency === "Inconsistent" ? "text-amber-600" : "text-red-600"
              )}>{positioning.tone_consistency}</span>
            </div>
          )}
          {positioning.visual_identity_strength && (
            <div>
              <span className="text-slate-400 block">Visual Identity</span>
              <span className={cn(
                "font-medium",
                positioning.visual_identity_strength === "Strong" ? "text-emerald-600" :
                positioning.visual_identity_strength === "Developing" ? "text-amber-600" : "text-red-600"
              )}>{positioning.visual_identity_strength}</span>
            </div>
          )}
        </div>
        {positioning.differentiation_assessment && (
          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2">
            {positioning.differentiation_assessment}
          </p>
        )}
        {positioning.positioning_gap && (
          <p className="text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1.5 leading-relaxed">
            {positioning.positioning_gap}
          </p>
        )}
      </div>

      {/* Visibility */}
      <div className="rounded-lg border border-slate-100 bg-white p-3 space-y-2">
        <h5 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <Eye className="h-3 w-3" /> SEO & Digital Visibility
        </h5>
        <div className="flex flex-wrap gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium border", SIGNAL_PILL(visibility.content_strategy_present))}>
            {visibility.content_strategy_present ? "Content Strategy" : "No Content Strategy"}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium border", SIGNAL_PILL(visibility.social_proof_present))}>
            {visibility.social_proof_present ? "Social Proof" : "No Social Proof"}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium border", SIGNAL_PILL(visibility.thought_leadership_present))}>
            {visibility.thought_leadership_present ? "Thought Leadership" : "No Thought Leadership"}
          </span>
          {visibility.overall_digital_visibility && (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium border",
              visibility.overall_digital_visibility === "High" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              visibility.overall_digital_visibility === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
              "bg-red-50 text-red-600 border-red-200"
            )}>
              {visibility.overall_digital_visibility} Visibility
            </span>
          )}
        </div>
        {visibility.seo_signals && (
          <div className="flex items-start gap-1.5 text-[11px] text-slate-500 pt-1">
            <Globe className="h-3 w-3 mt-0.5 shrink-0 text-slate-400" />
            <span>{visibility.seo_signals}</span>
          </div>
        )}
        {visibility.content_strategy_assessment && (
          <p className="text-[11px] text-slate-400 leading-relaxed">{visibility.content_strategy_assessment}</p>
        )}
        {visibility.social_proof_details && (
          <p className="text-[11px] text-slate-500 leading-relaxed">{visibility.social_proof_details}</p>
        )}
        {visibility.thought_leadership_details && (
          <p className="text-[11px] text-slate-500 leading-relaxed">{visibility.thought_leadership_details}</p>
        )}
      </div>

      {/* Foundation Gaps */}
      {foundation_gaps.length > 0 && (
        <div className="space-y-1.5">
          <h5 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1 px-0.5">
            <Lightbulb className="h-3 w-3" /> Foundation Gaps
          </h5>
          {foundation_gaps.map((gap, i) => (
            <BrandFoundationGapCard key={i} gap={gap} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, badge }: { item: IntelBriefItem; badge?: ReactNode }) {
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

function Section({
  title,
  children,
  accent,
  icon,
}: {
  title: string;
  children: ReactNode;
  accent: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <h4 className={cn("mb-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5", accent)}>
        {icon}
        {title}
      </h4>
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
        <p className="mt-1 text-xs text-slate-400">
          Add Instagram URL and Website URL to unlock AI-generated prospect intelligence.
        </p>
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
        Generating Intel Brief — fetching live data from their profiles… takes 15–45 seconds.
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
      <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
        <div>
          <p className="font-medium">First attempt didn&apos;t validate — retrying automatically…</p>
          <p className="mt-0.5 text-xs text-amber-600">
            No action needed. This updates on its own; manually retrying now would queue a duplicate run.
          </p>
        </div>
      </div>
    );
  }

  const {
    executive_summary,
    prospect_snapshot,
    brand_audit,
    ice_breakers,
    email_hook,
    recommended_next_action,
    negotiation_angles,
    loop_in_hooks,
    strengths,
    gaps,
    awkward_moments,
  } = brief.validatedOutput;

  return (
    <div className="space-y-5">
      {/* Header */}
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

      {/* Executive Summary */}
      {executive_summary && (
        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed">
          {executive_summary}
        </p>
      )}

      {/* Real data snapshot */}
      {prospect_snapshot && <SnapshotPanel snapshot={prospect_snapshot} />}

      {/* Brand audit */}
      {brand_audit && (
        <Section
          title="Brand Audit"
          accent="text-slate-700"
          icon={<Building2 className="h-3.5 w-3.5" />}
        >
          <BrandAuditPanel audit={brand_audit} />
        </Section>
      )}

      {/* Ice Breakers */}
      {ice_breakers?.length > 0 && (
        <Section
          title="Ice Breakers"
          accent="text-indigo-600"
          icon={<MessageSquare className="h-3.5 w-3.5" />}
        >
          {ice_breakers.map((item, i) => (
            <IceBreakerCard key={i} item={item} />
          ))}
        </Section>
      )}

      {/* Strengths */}
      <Section
        title="Strengths"
        accent="text-emerald-600"
        icon={<CheckCircle className="h-3.5 w-3.5" />}
      >
        {strengths.map((item, i) => (
          <ItemCard key={i} item={item} />
        ))}
      </Section>

      {/* Gaps & Opportunities */}
      <Section
        title="Gaps & Opportunities"
        accent="text-primary-700"
        icon={<TrendingUp className="h-3.5 w-3.5" />}
      >
        {gaps.map((gap, i) => (
          <ItemCard
            key={i}
            item={gap}
            badge={
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  PRIORITY_STYLE[(gap as IntelBriefGap).priority],
                )}
              >
                {PRIORITY_LABEL[(gap as IntelBriefGap).priority] ?? (gap as IntelBriefGap).priority}
              </span>
            }
          />
        ))}
      </Section>

      {/* Negotiation Angles */}
      {negotiation_angles?.length > 0 && (
        <Section
          title="Negotiation Angles"
          accent="text-emerald-700"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        >
          {negotiation_angles.map((item, i) => (
            <NegotiationCard key={i} item={item} />
          ))}
        </Section>
      )}

      {/* Watch Out For */}
      <Section
        title="Watch Out For"
        accent="text-amber-600"
        icon={<AlertCircle className="h-3.5 w-3.5" />}
      >
        {awkward_moments.map((item, i) => (
          <ItemCard key={i} item={item} />
        ))}
      </Section>

      {/* Loop-in Hooks */}
      {loop_in_hooks?.length > 0 && (
        <Section
          title="Loop-in Hooks"
          accent="text-purple-600"
          icon={<RotateCcw className="h-3.5 w-3.5" />}
        >
          {loop_in_hooks.map((item, i) => (
            <LoopInCard key={i} item={item} />
          ))}
        </Section>
      )}

      {/* Email Hook */}
      {email_hook && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">
              Email Hook
            </p>
            <CopyButton text={email_hook} />
          </div>
          <p className="text-xs text-indigo-700 leading-relaxed">{email_hook}</p>
        </div>
      )}

      {/* Recommended Next Action */}
      {recommended_next_action && (
        <div className="rounded-lg border border-purple-100 bg-purple-50 p-3">
          <p className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider mb-1">
            Recommended Next Action
          </p>
          <p className="text-xs text-purple-700 leading-relaxed">{recommended_next_action}</p>
        </div>
      )}

      <p className="text-[10px] text-slate-300 text-right">
        {brief.aiModelUsed} · {new Date(brief.updatedAt).toLocaleDateString("en-IN")}
      </p>
    </div>
  );
}
