import { Role } from "@lms/types";
import type { Result } from "../types";

type AssignmentContext = {
  creatorId: string;
  creatorRole: Role;
  explicitAssigneeId?: string; // only provided by Sub Admin/Admin
};

// ─────────────────────────────────────────
// Determine assignedToId at lead creation time
//
// EMPLOYEE creates lead → assigned to themselves
// SUB_ADMIN/ADMIN creates → use explicit assignee if provided,
//                           otherwise assign to themselves
// ─────────────────────────────────────────
export function resolveAssigneeOnCreate(context: AssignmentContext): string {
  if (context.creatorRole === Role.EMPLOYEE) {
    return context.creatorId;
  }

  // Sub Admin or Admin — use explicit if provided, else self
  return context.explicitAssigneeId ?? context.creatorId;
}

// ─────────────────────────────────────────
// Validate a reassignment operation
// Only validates business rules — permission check
// already done in auth package before calling this
// ─────────────────────────────────────────
export function validateReassignment(params: {
  newAssigneeId: string;
  newAssigneeRole: Role;
  leadStatus: string;
}): Result<{ assignedToId: string }> {
  // Cannot assign to another Sub Admin or Admin
  if (
    params.newAssigneeRole === Role.ADMIN ||
    params.newAssigneeRole === Role.SUB_ADMIN
  ) {
    return {
      success: false,
      error: {
        code: "INVALID_ASSIGNMENT",
        message: "Leads can only be assigned to employees.",
        meta: { newAssigneeRole: params.newAssigneeRole },
      },
    };
  }

  // CLIENT leads can still be reassigned (brief §8 edge case 10: existing Intel Brief
  // must remain visible to new assignee — reassignment is allowed, brief stays)
  // No block here — business decision: allow reassignment at any status.

  return {
    success: true,
    data: { assignedToId: params.newAssigneeId },
  };
}

// ─────────────────────────────────────────
// Handle user deactivation
// Returns lead IDs that need to be unassigned
// API layer updates them all to assignedToId = null
// and creates audit log entries
// ─────────────────────────────────────────
export function resolveDeactivationUnassignment(params: {
  deactivatedUserId: string;
  assignedLeads: Array<{ id: string; status: string }>;
}): {
  leadIdsToUnassign: string[];
  skippedLeadIds: string[]; // CLIENT leads stay assigned for history
} {
  const leadIdsToUnassign: string[] = [];
  const skippedLeadIds: string[] = [];

  for (const lead of params.assignedLeads) {
    // CLIENT leads keep their assignment for deal history — skip
    if (lead.status === "CLIENT") {
      skippedLeadIds.push(lead.id);
      continue;
    }
    leadIdsToUnassign.push(lead.id);
  }

  return { leadIdsToUnassign, skippedLeadIds };
}
