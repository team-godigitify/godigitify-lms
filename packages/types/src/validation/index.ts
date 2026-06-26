// Common validators
export {
  indianPhone,
  validEmail,
  optionalEmail,
  strongPassword,
  uploadUrl,
  optionalUploadUrl,
  paginationSchema,
  dateString,
} from "./common";

// Auth
export {
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  SetupPasswordSchema,
  AdminResetPasswordSchema,
} from "./auth";
export type {
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  SetupPasswordInput,
} from "./auth";

// Lead
export {
  CreateLeadSchema,
  UpdateLeadSchema,
  TransitionLeadSchema,
  AssignLeadSchema,
  BulkAssignSchema,
  BulkStatusSchema,
  LeadListQuerySchema,
  CreateClientDealSchema,
} from "./lead";
export type {
  CreateLeadInput,
  UpdateLeadInput,
  TransitionLeadInput,
  AssignLeadInput,
  BulkAssignInput,
  BulkStatusInput,
  LeadListQuery,
  CreateClientDealInput,
} from "./lead";

// Interaction
export { CreateInteractionSchema, EditInteractionSchema } from "./interaction";
export type {
  CreateInteractionInput,
  EditInteractionInput,
} from "./interaction";

// User
export { CreateUserSchema, UpdateUserSchema } from "./user";
export type { CreateUserInput, UpdateUserInput } from "./user";

// Branch
export { CreateBranchSchema, UpdateBranchSchema } from "./branch";
export type { CreateBranchInput, UpdateBranchInput } from "./branch";
