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
// Who can manually re-trigger an Intel Brief?
// Anyone who can view the lead.
// ─────────────────────────────────────────
export function canTriggerIntelBrief(
  user: AuthUser,
  lead: { assignedToId: string | null; createdById: string }
): boolean {
  if (user.role === Role.ADMIN || user.role === Role.SUB_ADMIN) return true
  return lead.assignedToId === user.id || lead.createdById === user.id
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
