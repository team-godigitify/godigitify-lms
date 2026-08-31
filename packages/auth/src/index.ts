// Types
export type { AuthUser, LeadOwnership, InteractionOwnership } from "./types";

// Lead permissions
export {
  canCreateLead,
  canViewLead,
  canUpdateLead,
  canTransitionLead,
  canAssignLead,
  canDeactivateLead,
} from "./permissions/lead";

// Interaction permissions
export {
  canAddInteraction,
  canEditInteraction,
  isInteractionEditTimeLimited,
  canDeleteInteraction,
} from "./permissions/interaction";

// User permissions
export {
  canCreateUser,
  canUpdateUser,
  canDeactivateUser,
} from "./permissions/user";

// Admin permissions
export {
  canManageSourceTypes,
  canManageClientDeal,
  canTriggerIntelBrief,
  canGrantIntelBriefAccess,
  canViewAnalytics,
  canImportLeads,
} from "./permissions/admin";
