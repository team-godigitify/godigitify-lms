import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Role, paginationSchema } from "@lms/types";
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

      const [leads, total] = await Promise.all([
        fastify.prisma.lead.findMany({
          where: {
            assignedToId: null,
            status: { notIn: ["CLIENT", "DUPLICATE", "LOST"] },
          },
          select: leadSummarySelect,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        fastify.prisma.lead.count({
          where: {
            assignedToId: null,
            status: { notIn: ["CLIENT", "DUPLICATE", "LOST"] },
          },
        }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { leads, total, page, pageSize },
      });
    },
  );
}
