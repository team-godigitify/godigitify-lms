import type { UserSummary } from "./user";
import type { IntelBriefStatus } from "../enums";

// ─────────────────────────────────────────
// CLIENT DEAL
// Replaces ConfirmedApplication.
// Created when a lead is closed as CLIENT.
// Gates the CLIENT status transition.
// ─────────────────────────────────────────

export type ClientDeal = {
  id: string;
  leadId: string;
  dealValue: number;
  servicesSold: string[];
  contractStartDate: Date;
  quotationLink: string;
  closedBy: UserSummary;
  createdAt: Date;
  updatedAt: Date;
};

// ─────────────────────────────────────────
// INTEL BRIEF
// AI-generated prospect intelligence.
// Generation is an agentic Claude loop that fetches real URLs
// before producing the brief — no guessing allowed.
// ─────────────────────────────────────────

export type IntelBriefItem = {
  finding: string;
  evidence: string;
  confidence_score: number; // 0–100; items below 50 hidden in UI
};

export type IntelBriefGap = IntelBriefItem & {
  priority: "P1" | "P2" | "P3"; // P1 = most urgent, shown first
};

// Real data extracted from fetched pages
export type ProspectSnapshot = {
  instagram_followers: number | null;
  instagram_following: number | null;
  instagram_posts: number | null;
  instagram_bio: string | null;
  instagram_engagement_quality: string | null;
  website_exists: boolean;
  website_summary: string | null;
};

// Specific conversation opener referencing real content
export type IceBreaker = {
  topic: string;       // specific thing from their actual content
  opener: string;      // exact line for the salesperson to say
  why_it_works: string; // psychological reason
};

// Price-objection ammunition
export type NegotiationAngle = {
  angle: string;       // short title
  script_line: string; // exact line to use
  when_to_use: string; // trigger situation
};

// Re-engagement templates for when leads go cold
export type LoopInHook = {
  trigger: string;          // situation that calls for this message
  message_template: string; // ready-to-send WhatsApp/email copy
};

// Brand consulting assessment — think Interbrand / Landor
export type BrandPositioning = {
  brand_promise: string | null;
  target_audience_clarity: "Clear" | "Vague" | "Generic" | null;
  differentiation_score: number | null; // 0–100
  differentiation_assessment: string | null;
  tone_of_voice: string | null;
  tone_consistency: "Consistent" | "Inconsistent" | "Absent" | null;
  visual_identity_strength: "Strong" | "Developing" | "Weak" | null;
  positioning_gap: string | null;
};

export type BrandVisibility = {
  seo_signals: string | null;
  content_strategy_present: boolean;
  content_strategy_assessment: string | null;
  social_proof_present: boolean;
  social_proof_details: string | null;
  thought_leadership_present: boolean;
  thought_leadership_details: string | null;
  overall_digital_visibility: "High" | "Medium" | "Low" | null;
};

export type BrandFoundationGap = {
  gap: string;
  business_impact: string;
  priority: "Critical" | "Important" | "Nice-to-have";
  quick_win: boolean;
};

export type BrandAudit = {
  positioning: BrandPositioning;
  visibility: BrandVisibility;
  foundation_gaps: BrandFoundationGap[];
  brand_maturity_score: number; // 0–100
  brand_maturity_label: "Early-stage" | "Developing" | "Established" | "Strong";
  consulting_verdict: string;
};

export type IntelBriefValidatedOutput = {
  executive_summary: string;
  prospect_snapshot: ProspectSnapshot;
  brand_audit: BrandAudit;
  ice_breakers: IceBreaker[];
  email_hook: string;
  recommended_next_action: string;
  negotiation_angles: NegotiationAngle[];
  loop_in_hooks: LoopInHook[];
  strengths: IntelBriefItem[];
  gaps: IntelBriefGap[];
  awkward_moments: IntelBriefItem[];
};

export type IntelBrief = {
  id: string;
  leadId: string;
  rawInput: Record<string, unknown>;
  aiOutput: Record<string, unknown>;
  validatedOutput: IntelBriefValidatedOutput | null; // null when status = NEEDS_REVIEW
  status: IntelBriefStatus;
  aiModelUsed: string;
  retryCount: number;
  manualOverrideBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};
