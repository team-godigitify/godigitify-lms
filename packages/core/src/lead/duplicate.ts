import { LeadStatus } from '@lms/types'
import type {
  DuplicateCheckResult,
  DuplicateContinuationData,
} from '../types'

// ─────────────────────────────────────────
// Input: existing leads fetched by API layer
// Core just applies the matching logic
// ─────────────────────────────────────────

type ExistingLead = {
  id: string
  phone: string
  email: string | null
  instagramUrl: string | null
  websiteUrl: string | null
  status: LeadStatus
  isDuplicate: boolean
  duplicateOfId: string | null
}

// ─────────────────────────────────────────
// Check if incoming fields match any existing lead
// Phone OR email OR instagramUrl OR websiteUrl = duplicate
// (any one match triggers — brief §6 rule)
// ─────────────────────────────────────────
export function checkDuplicate(
  incoming: {
    phone: string
    email?: string | null
    instagramUrl?: string | null
    websiteUrl?: string | null
  },
  existingLeads: ExistingLead[]
): DuplicateCheckResult {

  for (const lead of existingLeads) {
    const phoneMatch = lead.phone === incoming.phone

    const emailMatch =
      incoming.email != null &&
      lead.email != null &&
      lead.email.toLowerCase() === incoming.email.toLowerCase()

    // Normalize URLs before comparing: strip trailing slash, lowercase
    const normalizeUrl = (u: string | null | undefined): string | null => {
      if (!u) return null
      try {
        const parsed = new URL(u.toLowerCase().trim())
        return `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, '')
      } catch {
        return u.toLowerCase().trim()
      }
    }

    const incomingIg = normalizeUrl(incoming.instagramUrl)
    const leadIg = normalizeUrl(lead.instagramUrl)
    const instagramMatch = incomingIg != null && leadIg != null && incomingIg === leadIg

    const incomingWeb = normalizeUrl(incoming.websiteUrl)
    const leadWeb = normalizeUrl(lead.websiteUrl)
    const websiteMatch = incomingWeb != null && leadWeb != null && incomingWeb === leadWeb

    const matchCount = [phoneMatch, emailMatch, instagramMatch, websiteMatch].filter(Boolean).length
    if (matchCount === 0) continue

    let matchType: 'PHONE' | 'EMAIL' | 'INSTAGRAM_URL' | 'WEBSITE_URL' | 'MULTIPLE'
    if (matchCount > 1) {
      matchType = 'MULTIPLE'
    } else if (phoneMatch) {
      matchType = 'PHONE'
    } else if (emailMatch) {
      matchType = 'EMAIL'
    } else if (instagramMatch) {
      matchType = 'INSTAGRAM_URL'
    } else {
      matchType = 'WEBSITE_URL'
    }

    // If existing lead is itself a duplicate, redirect to the original
    const targetLeadId =
      lead.isDuplicate && lead.duplicateOfId != null
        ? lead.duplicateOfId
        : lead.id

    return {
      isDuplicate: true,
      matchType,
      existingLeadId: lead.id,
      existingLeadStatus: lead.status,
      originalLeadId: targetLeadId,
    }
  }

  return { isDuplicate: false }
}

// ─────────────────────────────────────────
// Build the continuation data when duplicate found
// This gets added as an InteractionLog entry on the ORIGINAL lead
// ─────────────────────────────────────────
export function buildDuplicateContinuation(params: {
  matchType: 'PHONE' | 'EMAIL' | 'INSTAGRAM_URL' | 'WEBSITE_URL' | 'MULTIPLE'
  incomingName: string | null
  incomingSourceName: string | null
  incomingFollowUpAt: Date | null
  originalLeadId: string
}): DuplicateContinuationData {

  const {
    matchType,
    incomingName,
    incomingSourceName,
    incomingFollowUpAt,
    originalLeadId,
  } = params

  const matchDescription =
    matchType === 'MULTIPLE' ? 'multiple fields'
    : matchType === 'PHONE' ? 'phone number'
    : matchType === 'EMAIL' ? 'email address'
    : matchType === 'INSTAGRAM_URL' ? 'Instagram URL'
    : 'website URL'

  const sourcePart = incomingSourceName ? ` via ${incomingSourceName}` : ''
  const namePart = incomingName ? ` from "${incomingName}"` : ''

  const continuationNote =
    `Duplicate lead received${sourcePart}. ` +
    `Matched by ${matchDescription}${namePart}. ` +
    `Continuing follow-up from previous interaction.`

  return {
    existingLeadId: originalLeadId,
    continuationNote,
    newFollowUpAt: incomingFollowUpAt,
    sourceId: null,
  }
}

// ─────────────────────────────────────────
// Handle LOST lead revival
// ─────────────────────────────────────────
export function buildLostLeadRevival(params: {
  lostLeadId: string
  lostLeadName: string | null
  incomingName: string | null
  incomingSourceName: string | null
}): {
  requiresRevivalConfirmation: true
  lostLeadId: string
  message: string
  continuationNoteIfRevived: string
} {
  const sourcePart = params.incomingSourceName
    ? ` via ${params.incomingSourceName}`
    : ''

  const nameLabel = params.incomingName ?? 'unknown'

  return {
    requiresRevivalConfirmation: true,
    lostLeadId: params.lostLeadId,
    message:
      `This lead was previously marked as LOST. ` +
      `A new enquiry was received${sourcePart} from "${nameLabel}". ` +
      `Would you like to continue follow-up?`,
    continuationNoteIfRevived:
      `Lead revived. New enquiry received${sourcePart} ` +
      `from "${nameLabel}". Continuing follow-up.`,
  }
}
