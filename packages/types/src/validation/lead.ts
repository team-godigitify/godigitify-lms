import { z } from "zod";
import { indianPhone, optionalEmail, dateString } from "./common";
import { LeadStatus, LeadPriority } from "../enums";

// ── Instagram URL validator ──
// Must contain instagram.com — catches obviously wrong domains (§8 edge case 5).
const instagramUrl = z
  .string()
  .trim()
  .url({ message: "Enter a valid URL" })
  .refine(
    (url) => {
      try {
        const host = new URL(url).hostname.toLowerCase();
        return host === "instagram.com" || host === "www.instagram.com";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid Instagram profile URL (instagram.com)" },
  );

// ── Website URL validator ──
const websiteUrl = z
  .string()
  .trim()
  .url({ message: "Enter a valid website URL" });

// ── Create Lead ──
// phone: mandatory.
// instagramUrl + websiteUrl: mandatory in the manual-creation UI (enforced at
// form level), but optional here so Meta leads can arrive without them.
export const CreateLeadSchema = z.object({
  // Optional identity
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty if provided")
    .max(200)
    .optional(),

  // Required contact
  phone: indianPhone,
  altPhone: indianPhone.optional(),

  // Digital presence — optional at API level (Meta leads may arrive without)
  instagramUrl: instagramUrl.optional(),
  websiteUrl: websiteUrl.optional(),

  // Optional contact + metadata
  email: optionalEmail,
  industry: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  leadPriority: z.nativeEnum(LeadPriority).default(LeadPriority.MEDIUM).optional(),
  dealSizeEstimate: z.number().positive("Deal size must be a positive number").optional(),

  // Source
  sourceId: z.string().cuid().optional(),
  sourceOther: z.string().trim().max(100).optional(),

  // Pipeline
  remarks: z.string().trim().max(1000).optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),

  // Assignment — only used by admin/sub-admin (enforced in route)
  assignedToId: z.string().cuid().optional(),

  // Revival confirmation for LOST leads
  confirmRevival: z.boolean().optional(),
  revivalLeadId: z.string().cuid().optional(),
});

// ── Update Lead — all optional ──
// phone cannot be changed (duplicate-detection key).
export const UpdateLeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty if provided")
    .max(200)
    .optional(),
  altPhone: indianPhone.optional(),
  instagramUrl: instagramUrl.optional(),
  websiteUrl: websiteUrl.optional(),
  email: optionalEmail,
  industry: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  leadPriority: z.nativeEnum(LeadPriority).optional(),
  dealSizeEstimate: z.number().positive("Deal size must be a positive number").optional(),
  sourceId: z.string().cuid().optional(),
  sourceOther: z.string().trim().max(100).optional(),
  remarks: z.string().trim().max(1000).optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),
});

// ── State Transition ──
export const TransitionLeadSchema = z.object({
  toStatus: z.nativeEnum(LeadStatus),
  note: z.string().trim().max(2000).optional(),
});

// ── Assign Lead ──
export const AssignLeadSchema = z.object({
  assignedToId: z.string().cuid({ message: "Invalid user ID" }),
  reason: z.string().trim().max(500).optional(),
});

// ── Bulk Assign ──
export const BulkAssignSchema = z.object({
  leadIds: z.array(z.string().cuid()).min(1).max(50),
  assignedToId: z.string().cuid(),
  reason: z.string().trim().max(500).optional(),
});

// ── Bulk Status ──
export const BulkStatusSchema = z.object({
  leadIds: z.array(z.string().cuid()).min(1).max(50),
  toStatus: z.nativeEnum(LeadStatus),
  note: z.string().trim().max(2000).optional(),
});

// ── Lead List Query ──
export const LeadListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => [20, 50, 80].includes(n), {
      message: "Page size must be 20, 50, or 80",
    })
    .default(20),
  status: z.nativeEnum(LeadStatus).optional(),
  assignedToId: z.union([z.literal("unassigned"), z.string().cuid()]).optional(),
  sourceId: z.string().cuid().optional(),
  branchId: z.string().cuid().optional(),
  industry: z.string().trim().max(100).optional(),
  leadPriority: z.nativeEnum(LeadPriority).optional(),
  isProfileComplete: z.coerce.boolean().optional(),
  search: z.string().trim().max(100).optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .optional(),
  sortBy: z
    .enum(["createdAt", "name", "status", "nextFollowUpAt", "leadPriority"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  overdue: z.coerce.boolean().optional(),
});

// ── Client Deal — gates CLIENT status transition ──
export const CreateClientDealSchema = z.object({
  dealValue: z
    .number()
    .positive("Deal value must be greater than zero"),
  servicesSold: z
    .array(z.string().trim().min(1))
    .min(1, "Select at least one service"),
  contractStartDate: dateString,
  quotationLink: z
    .string()
    .trim()
    .url({ message: "Quotation link must be a valid URL" }),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;
export type TransitionLeadInput = z.infer<typeof TransitionLeadSchema>;
export type AssignLeadInput = z.infer<typeof AssignLeadSchema>;
export type BulkAssignInput = z.infer<typeof BulkAssignSchema>;
export type BulkStatusInput = z.infer<typeof BulkStatusSchema>;
export type LeadListQuery = z.infer<typeof LeadListQuerySchema>;
export type CreateClientDealInput = z.infer<typeof CreateClientDealSchema>;
