export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  SUB_ADMIN = 'SUB_ADMIN',
  ADMIN = 'ADMIN',
}

export enum LeadStatus {
  NEW = 'NEW',
  ATTEMPTED_CONTACT = 'ATTEMPTED_CONTACT',
  CONNECTED = 'CONNECTED',
  INTERESTED = 'INTERESTED',
  FOLLOW_UP_SCHEDULED = 'FOLLOW_UP_SCHEDULED',
  NEGOTIATING = 'NEGOTIATING',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  CLIENT = 'CLIENT',
  LOST = 'LOST',
  NOT_INTERESTED = 'NOT_INTERESTED',
  NOT_REACHABLE = 'NOT_REACHABLE',
  DUPLICATE = 'DUPLICATE',
}

export enum LeadPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum IntelBriefStatus {
  PENDING = 'PENDING',
  COMPLETE = 'COMPLETE',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  FAILED = 'FAILED',
}

export enum InteractionType {
  NOTE = 'NOTE',
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  MEETING = 'MEETING',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

export enum TargetScope {
  COMPANY = 'COMPANY',
  BRANCH = 'BRANCH',
  EMPLOYEE = 'EMPLOYEE',
}

export enum TargetMetric {
  REVENUE = 'REVENUE',
  LEADS = 'LEADS',
  CONVERSIONS = 'CONVERSIONS',
}

// Lead status transition map.
// Defines which statuses a lead can move TO from each current status.
// This is the state machine contract — core enforces it, frontend reads it.
export const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [
    LeadStatus.ATTEMPTED_CONTACT,
    LeadStatus.CONNECTED,
    LeadStatus.NOT_REACHABLE,
    LeadStatus.DUPLICATE,
    LeadStatus.LOST,
  ],
  [LeadStatus.ATTEMPTED_CONTACT]: [
    LeadStatus.CONNECTED,
    LeadStatus.NOT_REACHABLE,
    LeadStatus.NOT_INTERESTED,
    LeadStatus.LOST,
    LeadStatus.FOLLOW_UP_SCHEDULED,
  ],
  [LeadStatus.CONNECTED]: [
    LeadStatus.INTERESTED,
    LeadStatus.NOT_INTERESTED,
    LeadStatus.FOLLOW_UP_SCHEDULED,
    LeadStatus.LOST,
  ],
  [LeadStatus.INTERESTED]: [
    LeadStatus.FOLLOW_UP_SCHEDULED,
    LeadStatus.NEGOTIATING,
    LeadStatus.NOT_INTERESTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.FOLLOW_UP_SCHEDULED]: [
    LeadStatus.CONNECTED,
    LeadStatus.ATTEMPTED_CONTACT,
    LeadStatus.INTERESTED,
    LeadStatus.NEGOTIATING,
    LeadStatus.NOT_INTERESTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.NEGOTIATING]: [
    LeadStatus.PROPOSAL_SENT,
    LeadStatus.FOLLOW_UP_SCHEDULED,
    LeadStatus.NOT_INTERESTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.PROPOSAL_SENT]: [
    LeadStatus.CLIENT,
    LeadStatus.NEGOTIATING,
    LeadStatus.NOT_INTERESTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.CLIENT]: [],     // terminal — closed won
  [LeadStatus.LOST]: [
    LeadStatus.ATTEMPTED_CONTACT, // can be revived
  ],
  [LeadStatus.NOT_INTERESTED]: [
    LeadStatus.ATTEMPTED_CONTACT, // can be revived
  ],
  [LeadStatus.NOT_REACHABLE]: [
    LeadStatus.ATTEMPTED_CONTACT,
    LeadStatus.CONNECTED,
  ],
  [LeadStatus.DUPLICATE]: [],  // terminal — stays duplicate
}
