// ─────────────────────────────────────────
// Lead scoring — 0-100, four equally-weighted signals:
//  1. Profile completeness (Instagram + website present)
//  2. Source quality (historical conversion rate of that lead source)
//  3. Engagement recency (time since last interaction, or since created
//     if never contacted)
//  4. Manual priority (the employee/manager's own LOW/MEDIUM/HIGH signal)
// Pure function — callers gather the inputs (DB access lives in apps/api).
// ─────────────────────────────────────────

export type LeadScoringInput = {
  isProfileComplete: boolean;
  instagramUrl: string | null;
  websiteUrl: string | null;
  leadPriority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: Date;
  lastInteractionAt: Date | null;
  /** 0-100 historical conversion rate of the lead's source; null if unknown. */
  sourceConversionRate: number | null;
};

export function computeLeadScore(
  input: LeadScoringInput,
  now: Date = new Date(),
): number {
  let score = 0;

  // Profile completeness — up to 25
  if (input.isProfileComplete) {
    score += 25;
  } else {
    if (input.instagramUrl) score += 12;
    if (input.websiteUrl) score += 13;
  }

  // Source quality — up to 25 (unknown source gets a neutral default)
  score +=
    input.sourceConversionRate !== null
      ? Math.round(Math.min(100, Math.max(0, input.sourceConversionRate)) * 0.25)
      : 10;

  // Engagement recency — up to 25
  const referenceDate = input.lastInteractionAt ?? input.createdAt;
  const hoursSince = (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60);
  if (hoursSince <= 24) score += 25;
  else if (hoursSince <= 72) score += 18;
  else if (hoursSince <= 168) score += 10;
  else if (hoursSince <= 336) score += 5;

  // Manual priority signal — up to 25
  score += input.leadPriority === "HIGH" ? 25 : input.leadPriority === "MEDIUM" ? 15 : 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}
