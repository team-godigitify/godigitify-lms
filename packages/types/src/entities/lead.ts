import type {
  LeadStatus,
  LeadPriority,
} from "../enums";
import type { UserSummary } from "./user";
import type { LeadSourceType } from "./course";

export type Lead = {
  id: string;
  name: string | null;
  phone: string;
  altPhone: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  isProfileComplete: boolean;
  email: string | null;
  industry: string | null;
  city: string | null;
  leadPriority: LeadPriority;
  dealSizeEstimate: number | null;
  sourceId: string | null;
  source: LeadSourceType | null;
  sourceOther: string | null;
  status: LeadStatus;
  remarks: string | null;
  nextFollowUpAt: Date | null;
  isDuplicate: boolean;
  duplicateOfId: string | null;
  confirmedAt: Date | null;
  confirmedById: string | null;
  branchId: string;
  // Meta Lead Form fields
  metaLeadgenId: string | null;
  metaAdName: string | null;
  metaRawPayload: Record<string, unknown> | null;
  // WhatsApp Cloud API fields
  isFromWhatsApp: boolean;
  waContactId: string | null;
  waFirstMessage: string | null;
  waMessageType: string | null;
  assignedTo: UserSummary | null;
  createdBy: UserSummary;
  createdAt: Date;
  updatedAt: Date;
};

// Lightweight version for list views — no nested objects
export type LeadSummary = {
  id: string;
  name: string | null;
  phone: string;
  altPhone: string | null;
  instagramUrl: string | null;
  isProfileComplete: boolean;
  email: string | null;
  industry: string | null;
  status: LeadStatus;
  leadPriority: LeadPriority;
  assignedTo: UserSummary | null;
  nextFollowUpAt: Date | null;
  createdAt: Date;
};
