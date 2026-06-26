import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Role } from "@lms/types";

export async function settingsRoutes(fastify: FastifyInstance): Promise<void> {
  const guard = [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])];

  // Lead source types
  fastify.get("/sources", { preHandler: authenticate }, async (_, reply) => {
    const sources = await fastify.prisma.leadSourceType.findMany({
      orderBy: { createdAt: "asc" },
    });
    return reply.send({ success: true, data: sources });
  });

  fastify.post("/sources", { preHandler: guard }, async (request, reply) => {
    const body = request.body as { name: string };
    const source = await fastify.prisma.leadSourceType.create({ data: body });
    return reply.status(201).send({ success: true, data: source });
  });

  fastify.patch(
    "/sources/:id",
    { preHandler: guard },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;
      const source = await fastify.prisma.leadSourceType.update({
        where: { id },
        data: body as any,
      });
      return reply.send({ success: true, data: source });
    },
  );
}
