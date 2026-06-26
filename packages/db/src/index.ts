// @lms/db - Prisma client and schema
// NOTE: Run `pnpm --filter @lms/db db:generate` after schema changes
// to regenerate the client before these exports resolve correctly.
export { PrismaClient, Prisma } from "./generated/client";
export type {
  Lead,
  User,
  Branch,
  LeadSourceType,
  InteractionLog,
  InteractionLogEdit,
  AssignmentHistory,
  AuditLog,
  ClientDeal,
  IntelBrief,
  RefreshToken,
  PasswordResetToken,
} from "./generated/client";

export {
  Role,
  LeadStatus,
  LeadPriority,
  IntelBriefStatus,
  InteractionType,
} from "./generated/client";
