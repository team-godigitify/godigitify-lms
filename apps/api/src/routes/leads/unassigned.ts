import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Role, LeadStatus, paginationSchema } from "@lms/types";
import { validateQuery } from "../../middleware/validate";
import { leadSummarySelect } from "./service";

export async function unassignedLeadsRoute(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get(
    "/unassigned",
    {
      preHandler: [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])],
    },
    async (request, reply) => {
      const qValidation = validateQuery(paginationSchema, request.query);
      if (!qValidation.success) {
        return reply.status(400).send({ success: false, ...qValidation.error });
      }
      const query = qValidation.data;
      const page = Math.max(1, query.page);
      const pageSize = query.pageSize;

      // Branch-scope like every other analytics/list route: SUB_ADMIN is
      // always locked to their own branch, ADMIN may pass any branchId or
      // omit for all. This route previously had no branch scoping at all.
      const { role, branchId: userBranchId } = request.user;
      const q = request.query as { branchId?: string };
      const branchId = role === "SUB_ADMIN" ? userBranchId : q.branchId;

      const where = {
        assignedToId: null,
        status: {
          notIn: [LeadStatus.CLIENT, LeadStatus.DUPLICATE, LeadStatus.LOST],
        },
        ...(branchId ? { branchId } : {}),
      };

      const [leads, total] = await Promise.all([
        fastify.prisma.lead.findMany({
          where,
          select: leadSummarySelect,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        fastify.prisma.lead.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { leads, total, page, pageSize },
      });
    },
  );
}
