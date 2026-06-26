// @lms/types - shared TypeScript types for Godigitify LMS

// Enums
export * from "./enums";

// Entities
export type { User, PublicUser, UserSummary } from "./entities/user";
export type { Branch } from "./entities/branch";
export type { LeadSourceType } from "./entities/course";
export type { Lead, LeadSummary } from "./entities/lead";
export type {
  InteractionLog,
  InteractionLogEdit,
} from "./entities/interaction";
export type {
  ClientDeal,
  IntelBrief,
  IntelBriefItem,
  IntelBriefGap,
  IntelBriefValidatedOutput,
} from "./entities/confirmed";

// API contracts
export type {
  LoginRequest,
  CreateLeadRequest,
  UpdateLeadRequest,
  TransitionLeadRequest,
  AssignLeadRequest,
  CreateInteractionRequest,
  EditInteractionRequest,
  CreateClientDealRequest,
} from "./api/requests";

export type {
  ApiResponse,
  ApiError,
  LoginResponse,
  LeadListResponse,
  LeadDetailResponse,
  LeadInteractionsResponse,
  ClientDealResponse,
  IntelBriefResponse,
  UserListResponse,
  LeadSourceTypesResponse,
  BranchesResponse,
} from "./api/responses";

// Validation schemas (runtime)
export * from './validation'
