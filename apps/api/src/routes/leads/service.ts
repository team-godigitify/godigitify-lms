import type { PrismaClient } from '@lms/db'
import type { LeadStatus, LeadPriority, Role } from '@lms/types'

function toDateRangeStart(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`)
}

function toDateRangeEnd(value: string): Date {
  return new Date(`${value}T23:59:59.999Z`)
}

// ── Shared lead select — what we return on every lead ──
export const leadSummarySelect = {
  id: true,
  name: true,
  phone: true,
  altPhone: true,
  email: true,
  status: true,
  city: true,
  instagramUrl: true,
  websiteUrl: true,
  isProfileComplete: true,
  industry: true,
  leadPriority: true,
  dealSizeEstimate: true,
  tags: true,
  leadScore: true,
  nextFollowUpAt: true,
  isDuplicate: true,
  confirmedAt: true,
  confirmedById: true,
  createdAt: true,
  updatedAt: true,
  source: { select: { id: true, name: true } },
  campaign: { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true, email: true, role: true } },
  createdBy: { select: { id: true, name: true } },
  intelBrief: { select: { id: true, status: true } },
  clientDeal: { select: { id: true, dealValue: true } },
  isFromWhatsApp: true,
  metaLeadgenId: true,
  metaAdName: true,
} as const

export const leadDetailSelect = {
  ...leadSummarySelect,
  remarks: true,
  sourceOther: true,
  duplicateOfId: true,
  branchId: true,
  metaRawPayload: true,
  branch: { select: { id: true, name: true, city: true } },
  waContactId: true,
  waFirstMessage: true,
  waMessageType: true,
  // Override summary selects with richer detail-level versions
  clientDeal: {
    select: {
      id: true,
      dealValue: true,
      servicesSold: true,
      contractStartDate: true,
      quotationLink: true,
      createdAt: true,
      closedBy: { select: { id: true, name: true } },
    },
  },
  intelBrief: {
    select: {
      id: true,
      status: true,
      validatedOutput: true,
      aiModelUsed: true,
      retryCount: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const

// ── Build WHERE clause based on role + filters ──
export function buildLeadWhereClause(params: {
  userId: string
  userRole: Role
  filters: {
    status?: LeadStatus
    assignedToId?: string
    sourceId?: string
    branchId?: string
    industry?: string
    leadPriority?: LeadPriority
    isProfileComplete?: boolean
    tags?: string[]
    leadScoreMin?: number
    leadScoreMax?: number
    allStatuses?: boolean
    excludeStatuses?: LeadStatus[]
    search?: string
    dateFrom?: string
    dateTo?: string
    overdue?: boolean
  }
}) {
  const { userId, userRole, filters } = params

  const andClauses: Record<string, unknown>[] = []

  // ── Role-based visibility (EMPLOYEE sees only their own leads) ──
  if (userRole === 'EMPLOYEE') {
    andClauses.push({
      OR: [
        { assignedToId: userId },
        { createdById: userId },
      ],
    })
  }

  // ── Status filter ──
  // When search is active: no status restriction.
  // An explicit status wins outright. Otherwise an explicit excludeStatuses
  // list (used by dashboard KPI drill-downs to reconstruct their exact
  // calculation) wins. Only when none of those apply do we fall back to the
  // organic-browsing default: hide CLIENT/INTERESTED (they have their own
  // tabs) — and allStatuses=true bypasses even that default.
  if (filters.search) {
    // global search — no status restriction
  } else if (filters.status) {
    andClauses.push({ status: filters.status })
  } else if (filters.excludeStatuses && filters.excludeStatuses.length > 0) {
    andClauses.push({ status: { notIn: filters.excludeStatuses } })
  } else if (!filters.allStatuses) {
    andClauses.push({ status: { notIn: ['CLIENT', 'INTERESTED'] } })
  }

  // ── Other filters ──
  if (filters.assignedToId === 'unassigned') {
    andClauses.push({ assignedToId: null })
  } else if (filters.assignedToId) {
    andClauses.push({ assignedToId: filters.assignedToId })
  }
  if (filters.sourceId)     andClauses.push({ sourceId: filters.sourceId })
  if (filters.branchId)     andClauses.push({ branchId: filters.branchId })
  if (filters.industry)     andClauses.push({ industry: { contains: filters.industry, mode: 'insensitive' } })
  if (filters.leadPriority) andClauses.push({ leadPriority: filters.leadPriority })
  if (filters.isProfileComplete !== undefined) andClauses.push({ isProfileComplete: filters.isProfileComplete })
  if (filters.tags && filters.tags.length > 0) andClauses.push({ tags: { hasSome: filters.tags } })
  if (filters.leadScoreMin !== undefined || filters.leadScoreMax !== undefined) {
    andClauses.push({
      leadScore: {
        ...(filters.leadScoreMin !== undefined ? { gte: filters.leadScoreMin } : {}),
        ...(filters.leadScoreMax !== undefined ? { lte: filters.leadScoreMax } : {}),
      },
    })
  }

  if (filters.overdue) {
    andClauses.push({ nextFollowUpAt: { lte: new Date() } })
    andClauses.push({ status: { notIn: ['CLIENT', 'DUPLICATE', 'LOST'] } })
  }

  // ── Full-DB search (name, phone, email, instagram, website, industry, city) ──
  if (filters.search) {
    andClauses.push({
      OR: [
        { name:         { contains: filters.search, mode: 'insensitive' } },
        { phone:        { contains: filters.search } },
        { email:        { contains: filters.search, mode: 'insensitive' } },
        { instagramUrl: { contains: filters.search, mode: 'insensitive' } },
        { websiteUrl:   { contains: filters.search, mode: 'insensitive' } },
        { industry:     { contains: filters.search, mode: 'insensitive' } },
        { city:         { contains: filters.search, mode: 'insensitive' } },
      ],
    })
  }

  if (filters.dateFrom ?? filters.dateTo) {
    andClauses.push({
      createdAt: {
        ...(filters.dateFrom ? { gte: toDateRangeStart(filters.dateFrom) } : {}),
        ...(filters.dateTo   ? { lte: toDateRangeEnd(filters.dateTo)   } : {}),
      },
    })
  }

  return andClauses.length === 0 ? {} : andClauses.length === 1 ? andClauses[0]! : { AND: andClauses }
}

// ── Duplicate check query ──
// Fetches candidates by phone, email, Instagram URL, and website URL.
// Core checkDuplicate then applies JS-level URL normalization.
export async function findDuplicateLeads(params: {
  phone: string
  email?: string | null
  instagramUrl?: string | null
  websiteUrl?: string | null
  prisma: PrismaClient
}) {
  const emailLower = params.email?.toLowerCase().trim() || null
  const orClauses: Array<Record<string, unknown>> = [{ phone: params.phone }]

  if (emailLower) {
    orClauses.push({ email: { equals: emailLower, mode: 'insensitive' as const } })
  }
  if (params.instagramUrl) {
    orClauses.push({ instagramUrl: { contains: params.instagramUrl, mode: 'insensitive' as const } })
  }
  if (params.websiteUrl) {
    orClauses.push({ websiteUrl: { contains: params.websiteUrl, mode: 'insensitive' as const } })
  }

  return params.prisma.lead.findMany({
    where: { OR: orClauses },
    select: {
      id: true,
      phone: true,
      email: true,
      instagramUrl: true,
      websiteUrl: true,
      status: true,
      isDuplicate: true,
      duplicateOfId: true,
      name: true,
    },
  })
}
