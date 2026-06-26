import { LeadStatus, Role } from '@lms/types'

// 1 hour in milliseconds
const CLIENT_VISIBILITY_WINDOW_MS = 60 * 60 * 1000

type VisibilityLead = {
  id: string
  status: LeadStatus
  assignedToId: string | null
  createdById: string
  confirmedAt: Date | null    // set when lead reaches CLIENT status
  confirmedById: string | null
}

type VisibilityUser = {
  id: string
  role: Role
}

// ─────────────────────────────────────────
// Can this user see this CLIENT lead?
// Admin/Sub Admin: always yes.
// Employee: yes if they closed it, within 1 hour window.
// ─────────────────────────────────────────
export function canEmployeeSeeClientLead(params: {
  lead: VisibilityLead
  user: VisibilityUser
  now?: Date
}): boolean {
  const { lead, user, now = new Date() } = params

  // Admin and Sub Admin always see everything
  if (user.role === Role.ADMIN || user.role === Role.SUB_ADMIN) {
    return true
  }

  // Lead is not a client yet — standard visibility rules apply
  if (lead.status !== LeadStatus.CLIENT) {
    return lead.assignedToId === user.id || lead.createdById === user.id
  }

  // Lead IS a client — check 1 hour window
  if (!lead.confirmedAt) return false

  // Employee must be the one who closed it
  if (lead.confirmedById !== user.id) return false

  const elapsed = now.getTime() - lead.confirmedAt.getTime()
  return elapsed <= CLIENT_VISIBILITY_WINDOW_MS
}

// ─────────────────────────────────────────
// Build the "closed by" tag for Admin/Sub Admin view
// ─────────────────────────────────────────
export function buildClosedByTag(params: {
  closedByName: string
  confirmedAt: Date
}): string {
  const timeAgo = formatTimeAgo(params.confirmedAt)
  return `Closed by ${params.closedByName} (${timeAgo})`
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}
