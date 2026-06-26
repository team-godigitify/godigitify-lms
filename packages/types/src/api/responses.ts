import type { Lead, LeadSummary } from "../entities/lead";
import type { InteractionLog } from "../entities/interaction";
import type { User, PublicUser } from "../entities/user";
import type { ClientDeal, IntelBrief } from "../entities/confirmed";
import type { Branch } from "../entities/branch";
import type { LeadSourceType } from "../entities/course";

// Standard API wrapper — every response follows this shape
export type ApiResponse<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

// Auth
export type LoginResponse = ApiResponse<{
  token: string;
  user: PublicUser;
}>;

// Leads
export type LeadListResponse = ApiResponse<{
  leads: LeadSummary[];
  total: number;
  page: number;
  pageSize: number;
}>;

export type LeadDetailResponse = ApiResponse<Lead>;

export type LeadInteractionsResponse = ApiResponse<{
  interactions: InteractionLog[];
}>;

// Client Deal (replaces ConfirmedApplicationResponse)
export type ClientDealResponse = ApiResponse<ClientDeal>;

// Intel Brief
export type IntelBriefResponse = ApiResponse<IntelBrief>;

// Users
export type UserListResponse = ApiResponse<User[]>;

// Reference data
export type LeadSourceTypesResponse = ApiResponse<LeadSourceType[]>;
export type BranchesResponse = ApiResponse<Branch[]>;
