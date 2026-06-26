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
// Every generation is a fresh, stateless Claude API call.
// ─────────────────────────────────────────

export type IntelBriefItem = {
  finding: string;
  evidence: string;
  confidence_score: number; // 0–100; items below 50 stored but hidden in UI
};

export type IntelBriefGap = IntelBriefItem & {
  priority: 'P1' | 'P2' | 'P3'; // P1 = most urgent, shown first
};

export type IntelBriefValidatedOutput = {
  strengths: IntelBriefItem[];        // 3–5 items
  gaps: IntelBriefGap[];              // 3–5 items, sorted by priority
  awkward_moments: IntelBriefItem[];  // 3–5 items
  email_hook: string;
  executive_summary: string;
  recommended_next_action: string;
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
