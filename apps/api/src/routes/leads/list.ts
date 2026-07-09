import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { LeadListQuerySchema } from "@lms/types";
import { validateQuery } from "../../middleware/validate";
import { buildLeadWhereClause, leadSummarySelect } from "./service";
import type { LeadStatus, LeadPriority, Role } from "@lms/types";

const ALLOWED_PAGE_SIZES = [20, 50, 80];
const DEFAULT_PAGE_SIZE = 20;

const SORT_FIELDS: Record<string, string> = {
  createdAt: "createdAt",
  name: "name",
  status: "status",
  nextFollowUpAt: "nextFollowUpAt",
  leadPriority: "leadPriority",
};

export async function leadListRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const qValidation = validateQuery(LeadListQuerySchema, request.query);
      if (!qValidation.success) {
        return reply.status(400).send({ success: false, ...qValidation.error });
      }

      const query = qValidation.data;
      const page = Math.max(1, query.page);
      const pageSize = ALLOWED_PAGE_SIZES.includes(query.pageSize)
        ? query.pageSize
        : DEFAULT_PAGE_SIZE;

      const sortBy = SORT_FIELDS[query.sortBy ?? "createdAt"] ?? "createdAt";
      const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

      const { id: userId, role } = request.user;

      const assignedToId = role === "EMPLOYEE" ? undefined : query.assignedToId;
      const filters: Parameters<typeof buildLeadWhereClause>[0]["filters"] = {};

      if (query.status) filters.status = query.status as LeadStatus;
      if (assignedToId) filters.assignedToId = assignedToId;
      if (query.sourceId) filters.sourceId = query.sourceId;
      if (query.search) filters.search = query.search;
      if (query.dateFrom) filters.dateFrom = query.dateFrom;
      if (query.dateTo) filters.dateTo = query.dateTo;
      // ADMIN may query any branch (or omit for all); SUB_ADMIN is always
      // locked to their own branch regardless of what's passed in the query —
      // mirrors effectiveBranchId() in routes/analytics/index.ts.
      if (role === "ADMIN") {
        if (query.branchId) filters.branchId = query.branchId;
      } else if (role === "SUB_ADMIN") {
        filters.branchId = request.user.branchId;
      }
      if (query.overdue) filters.overdue = true;
      if (query.industry) filters.industry = query.industry;
      if (query.leadPriority) filters.leadPriority = query.leadPriority as LeadPriority;
      if (query.isProfileComplete !== undefined) filters.isProfileComplete = query.isProfileComplete;
      if (query.tags) filters.tags = query.tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (query.allStatuses) filters.allStatuses = true;
      if (query.excludeStatus) {
        filters.excludeStatuses = query.excludeStatus
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean) as LeadStatus[];
      }
      if (query.leadScoreMin !== undefined) filters.leadScoreMin = query.leadScoreMin;
      if (query.leadScoreMax !== undefined) filters.leadScoreMax = query.leadScoreMax;

      const where = buildLeadWhereClause({
        userId,
        userRole: role as Role,
        filters,
      });

      const [leads, total] = await Promise.all([
        fastify.prisma.lead.findMany({
          where,
          select: leadSummarySelect,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        fastify.prisma.lead.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: {
          leads,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    },
  );
}
