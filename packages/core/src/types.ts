// Success/failure wrapper — core never throws
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: CoreError }

export type CoreError = {
  code: CoreErrorCode
  message: string
  meta?: Record<string, unknown>
}

export type CoreErrorCode =
  | 'INVALID_TRANSITION'
  | 'DUPLICATE_LEAD'
  | 'LEAD_NOT_FOUND'
  | 'INVALID_ASSIGNMENT'
  | 'LOST_LEAD_REVIVAL_REQUIRED'
  | 'ALREADY_CLIENT'
  | 'PERMISSION_DENIED'
  | 'INTEL_BRIEF_ALREADY_RUNNING'
  | 'CLIENT_DEAL_REQUIRED'

// Duplicate detection result
export type DuplicateCheckResult =
  | { isDuplicate: false }
  | {
      isDuplicate: true
      matchType: 'PHONE' | 'EMAIL' | 'INSTAGRAM_URL' | 'WEBSITE_URL' | 'MULTIPLE'
      existingLeadId: string        // the lead to redirect to
      existingLeadStatus: string
      originalLeadId: string        // if existing is DUPLICATE, this is Lead B
    }

// What happens when a duplicate enquiry comes in
export type DuplicateContinuationData = {
  existingLeadId: string
  continuationNote: string         // auto-generated note for InteractionLog
  newFollowUpAt: Date | null
  sourceId: string | null
}

// Import processing result
export type ImportResult = {
  imported: ProcessedLeadRow[]
  duplicateQueue: DuplicateQueueItem[]
  errors: ImportRowError[]
}

export type ProcessedLeadRow = {
  rowIndex: number
  name: string | null
  phone: string
  instagramUrl: string | null
  websiteUrl: string | null
  email: string | null
  industry: string | null
  city: string | null
  leadPriority: string | null
  dealSizeEstimate: string | null
  remarks: string | null
  source: string | null
}

export type DuplicateQueueItem = {
  rowIndex: number
  rowData: ProcessedLeadRow
  matchType: 'PHONE' | 'EMAIL' | 'INSTAGRAM_URL' | 'WEBSITE_URL' | 'MULTIPLE'
  existingLeadId: string
  originalLeadId: string
}

export type ImportRowError = {
  rowIndex: number
  reason: string
}

// Follow-up check result
export type OverdueFollowUp = {
  leadId: string
  leadName: string | null          // name is optional on Godigitify leads
  phone: string
  assignedToId: string | null
  assignedToEmail: string | null
  overdueBy: number                // minutes overdue
  nextFollowUpAt: Date
}
