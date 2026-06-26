import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Role, CreateBranchSchema, UpdateBranchSchema } from "@lms/types";
import { validateBody } from "../../middleware/validate";

export async function branchRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /branches — List all branches
  fastify.get(
    "/",
    {
      preHandler: [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])],
    },
    async (_request, reply) => {
      const branches = await fastify.prisma.branch.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          _count: {
            select: { users: true, leads: true },
          },
        },
      });

      return reply.status(200).send({ success: true, data: { branches } });
    },
  );

  // POST /branches — Create branch (admin only)
  fastify.post(
    "/",
    {
      preHandler: [authenticate, authorize([Role.ADMIN])],
    },
    async (request, reply) => {
      const validation = validateBody(CreateBranchSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ success: false, ...validation.error });
      }
      const body = validation.data;

      const branch = await fastify.prisma.branch.create({
        data: {
          name: body.name,
          city: body.city,
          address: body.address ?? null,
        },
      });

      return reply.status(201).send({ success: true, data: branch });
    },
  );

  // PATCH /branches/:id — Update branch (admin only)
  fastify.patch(
    "/:id",
    {
      preHandler: [authenticate, authorize([Role.ADMIN])],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const validation2 = validateBody(UpdateBranchSchema, request.body);
      if (!validation2.success) {
        return reply.status(400).send({ success: false, ...validation2.error });
      }
      const body = validation2.data;

      const branch = await fastify.prisma.branch.findUnique({ where: { id } });

      if (!branch) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Branch not found" },
        });
      }

      const updated = await fastify.prisma.branch.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          ...(body.address !== undefined ? { address: body.address } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });

      return reply.status(200).send({ success: true, data: updated });
    },
  );
}
