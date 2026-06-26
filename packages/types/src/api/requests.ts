import type {
  InteractionType,
  LeadStatus,
  LeadPriority,
} from "../enums";

// Auth
export type LoginRequest = {
  email: string;
  password: string;
};

// Lead creation
// phone is mandatory; instagramUrl + websiteUrl mandatory in UI but nullable at API
// level to allow Meta leads to land without them (isProfileComplete = false).
export type CreateLeadRequest = {
  name?: string;
  phone: string;
  instagramUrl?: string;
  websiteUrl?: string;
  email?: string;
  industry?: string;
  city?: string;
  leadPriority?: LeadPriority;
  dealSizeEstimate?: number;
  sourceId?: string;
  sourceOther?: string;
  remarks?: string;
  nextFollowUpAt?: string | null;
  assignedToId?: string;
  confirmRevival?: boolean;
  revivalLeadId?: string;
};

// Lead update — all optional, phone cannot change (duplicate-detection key)
export type UpdateLeadRequest = {
  name?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  email?: string;
  industry?: string;
  city?: string;
  leadPriority?: LeadPriority;
  dealSizeEstimate?: number;
  sourceId?: string;
  sourceOther?: string;
  remarks?: string;
  nextFollowUpAt?: string | null;
};

// State transition
export type TransitionLeadRequest = {
  toStatus: LeadStatus;
  note?: string;
};

// Assignment
export type AssignLeadRequest = {
  assignedToId: string;
  reason?: string;
};

// Interaction / activity log
export type CreateInteractionRequest = {
  type: InteractionType;
  note?: string;
  callRecordingUrl?: string;
  callDurationSecs?: number;
};

export type EditInteractionRequest = {
  note: string;
};

// Client Deal — gates the CLIENT transition
export type CreateClientDealRequest = {
  dealValue: number;
  servicesSold: string[];
  contractStartDate: string; // ISO date string
  quotationLink: string;
};
