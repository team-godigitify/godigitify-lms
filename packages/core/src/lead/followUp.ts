import type { OverdueFollowUp } from "../types";

type LeadWithFollowUp = {
  id: string;
  leadName: string | null;  // name is optional on Godigitify leads
  phone: string;
  assignedToId: string | null;
  assignedToEmail: string | null;
  nextFollowUpAt: Date | null;
};

// ─────────────────────────────────────────
// Find all leads with overdue follow-ups
// Called by a scheduled job in apps/api
// Returns data needed to send notifications
// ─────────────────────────────────────────
export function detectOverdueFollowUps(
  leads: LeadWithFollowUp[],
  now: Date = new Date(),
): OverdueFollowUp[] {
  return leads
    .filter((lead) => {
      if (!lead.nextFollowUpAt) return false;
      return lead.nextFollowUpAt <= now;
    })
    .map((lead) => ({
      leadId: lead.id,
      leadName: lead.leadName,
      phone: lead.phone,
      assignedToId: lead.assignedToId,
      assignedToEmail: lead.assignedToEmail,
      overdueBy: Math.floor(
        (now.getTime() - lead.nextFollowUpAt!.getTime()) / 60000,
      ),
      nextFollowUpAt: lead.nextFollowUpAt!,
    }));
}

// ─────────────────────────────────────────
// Build notification payload for overdue follow-up
// API layer uses this to send email + in-app notification
// ─────────────────────────────────────────
export function buildFollowUpNotification(overdue: OverdueFollowUp): {
  recipientEmail: string | null;
  subject: string;
  body: string;
  inAppMessage: string;
} {
  const overdueText =
    overdue.overdueBy < 60
      ? `${overdue.overdueBy} minutes ago`
      : `${Math.floor(overdue.overdueBy / 60)} hours ago`;

  // Use phone as fallback identifier when name is not set
  const leadLabel = overdue.leadName ?? overdue.phone;

  return {
    recipientEmail: overdue.assignedToEmail,
    subject: `Follow-up overdue: ${leadLabel}`,
    body:
      `A follow-up was scheduled for ${leadLabel} ` +
      `and is now overdue by ${overdueText}. ` +
      `Please update the lead status.`,
    inAppMessage: `Follow-up overdue for ${leadLabel} (${overdueText})`,
  };
}
