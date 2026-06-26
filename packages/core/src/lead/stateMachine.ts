import { LeadStatus, VALID_TRANSITIONS } from '@lms/types'
import type { Result } from '../types'

// ─────────────────────────────────────────
// Is this transition valid?
// ─────────────────────────────────────────
export function isValidTransition(
  from: LeadStatus,
  to: LeadStatus
): boolean {
  const validNext = VALID_TRANSITIONS[from]
  return validNext.includes(to)
}

// ─────────────────────────────────────────
// Get all valid next statuses from current
// Used by frontend to show only valid buttons
// ─────────────────────────────────────────
export function getValidTransitions(from: LeadStatus): LeadStatus[] {
  return VALID_TRANSITIONS[from] ?? []
}

// ─────────────────────────────────────────
// Attempt a transition — warn + block if invalid
// Returns error with valid options so UI can display them
// ─────────────────────────────────────────
export function transitionLead(
  currentStatus: LeadStatus,
  toStatus: LeadStatus
): Result<{ newStatus: LeadStatus }> {

  // Block terminal states
  if (currentStatus === LeadStatus.CLIENT) {
    return {
      success: false,
      error: {
        code: 'ALREADY_CLIENT',
        message: 'This lead is a confirmed client. No further transitions are allowed.',
        meta: { currentStatus, validTransitions: [] },
      },
    }
  }

  if (currentStatus === LeadStatus.DUPLICATE) {
    return {
      success: false,
      error: {
        code: 'INVALID_TRANSITION',
        message: 'This lead is marked as duplicate. Navigate to the original lead.',
        meta: { currentStatus, validTransitions: [] },
      },
    }
  }

  // Validate the transition
  if (!isValidTransition(currentStatus, toStatus)) {
    const validTransitions = getValidTransitions(currentStatus)
    return {
      success: false,
      error: {
        code: 'INVALID_TRANSITION',
        message: `Cannot move from ${currentStatus} to ${toStatus}. Choose a valid next stage.`,
        meta: {
          currentStatus,
          attemptedStatus: toStatus,
          validTransitions,   // frontend shows these as options
        },
      },
    }
  }

  return {
    success: true,
    data: { newStatus: toStatus },
  }
}
