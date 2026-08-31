import { Role } from '@lms/types'
import type { AuthUser, InteractionOwnership, LeadOwnership } from '../types'

// ─────────────────────────────────────────
// Who can add an interaction/feedback?
// Any user who can view the lead can add interactions
// ─────────────────────────────────────────
export function canAddInteraction(
  user: AuthUser,
  lead: LeadOwnership
): boolean {
  // Reuse lead view permission
  if (user.role === Role.ADMIN || user.role === Role.SUB_ADMIN) return true
  return lead.assignedToId === user.id || lead.createdById === user.id
}

// ─────────────────────────────────────────
// Who can edit an interaction note?
// The author of the note (any role, including EMPLOYEE), plus ADMIN and
// SUB_ADMIN for any note.
// Auditability is preserved not by blocking edits but by recording every one:
// each edit writes an InteractionLogEdit row (noteBefore/noteAfter/editedBy),
// and the interaction is flagged isEdited. Nothing is ever lost.
// ─────────────────────────────────────────
export function canEditInteraction(
  user: AuthUser,
  interaction: InteractionOwnership
): boolean {
  if (interaction.isDeleted) return false
  if (interaction.userId === user.id) return true
  return user.role === Role.ADMIN || user.role === Role.SUB_ADMIN
}

// ─────────────────────────────────────────
// Does the 24-hour edit window apply?
// Authors may revise their own notes indefinitely — the full trail is kept,
// so a late correction is auditable rather than lost.
// A manager editing SOMEONE ELSE'S note stays bound by the window.
// ─────────────────────────────────────────
export function isInteractionEditTimeLimited(
  user: AuthUser,
  interaction: InteractionOwnership
): boolean {
  return interaction.userId !== user.id
}

// ─────────────────────────────────────────
// Who can soft-delete an interaction?
// ADMIN only
// ─────────────────────────────────────────
export function canDeleteInteraction(user: AuthUser): boolean {
  return user.role === Role.ADMIN
}