import { Role } from '@lms/types'
import type { AuthUser } from '../types'

// ─────────────────────────────────────────
// Who can manage lead source types?
// SUB_ADMIN and ADMIN
// ─────────────────────────────────────────
export function canManageSourceTypes(user: AuthUser): boolean {
  return user.role === Role.SUB_ADMIN || user.role === Role.ADMIN
}

// ─────────────────────────────────────────
// Who can create/update a Client Deal?
// The employee assigned to the lead, Sub Admin, or Admin.
// ─────────────────────────────────────────
export function canManageClientDeal(
  user: AuthUser,
  lead: { assignedToId: string | null; createdById: string }
): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUB_ADMIN) return true
  return lead.assignedToId === user.id || lead.createdById === user.id
}

// ─────────────────────────────────────────
// Who can manually trigger / re-trigger an Intel Brief?
// ADMIN and SUB_ADMIN on any lead.
// An EMPLOYEE only if they have been granted User.canGenerateIntelBrief, and
// only on leads they own — generation costs an AI API call, so it is opt-in
// per user rather than open to every employee.
// ─────────────────────────────────────────
export function canTriggerIntelBrief(
  user: AuthUser,
  lead: { assignedToId: string | null; createdById: string }
): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUB_ADMIN) return true
  if (!user.canGenerateIntelBrief) return false
  return lead.assignedToId === user.id || lead.createdById === user.id
}

// ─────────────────────────────────────────
// Who can grant/revoke another user's Intel Brief access?
// ADMIN and SUB_ADMIN — same bar as the rest of user management.
// ─────────────────────────────────────────
export function canGrantIntelBriefAccess(user: AuthUser): boolean {
  return user.role === Role.SUB_ADMIN || user.role === Role.ADMIN
}

// ─────────────────────────────────────────
// Who can view analytics?
// SUB_ADMIN and ADMIN
// ─────────────────────────────────────────
export function canViewAnalytics(user: AuthUser): boolean {
  return user.role === Role.SUB_ADMIN || user.role === Role.ADMIN
}

// ─────────────────────────────────────────
// Who can import leads via Excel/CSV?
// SUB_ADMIN and ADMIN only.
// ─────────────────────────────────────────
export function canImportLeads(user: AuthUser): boolean {
  return user.role === Role.SUB_ADMIN || user.role === Role.ADMIN
}
