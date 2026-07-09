import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Role, CreateCampaignSchema, UpdateCampaignSchema } from "@lms/types";
import { validateBody } from "../../middleware/validate";

export async function campaignRoutes(fastify: FastifyInstance): Promise<void> {
  const guard = [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])];

  // GET /campaigns — list, with lead count for a quick volume sense-check
  fastify.get("/", { preHandler: guard }, async (_request, reply) => {
    const campaigns = await fastify.prisma.campaign.findMany({
      orderBy: { startDate: "desc" },
      include: {
        source: { select: { id: true, name: true } },
        _count: { select: { leads: true } },
      },
    });

    return reply.status(200).send({ success: true, data: { campaigns } });
  });

  // POST /campaigns — create
  fastify.post("/", { preHandler: guard }, async (request, reply) => {
    const validation = validateBody(CreateCampaignSchema, request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, ...validation.error });
    }
    const body = validation.data;

    const campaign = await fastify.prisma.campaign.create({
      data: {
        name: body.name,
        sourceId: body.sourceId,
        metaCampaignId: body.metaCampaignId ?? null,
        spend: body.spend ?? null,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });

    return reply.status(201).send({ success: true, data: campaign });
  });

  // PATCH /campaigns/:id — update (spend, end date, active flag, rename)
  fastify.patch("/:id", { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const validation = validateBody(UpdateCampaignSchema, request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, ...validation.error });
    }
    const body = validation.data;

    const campaign = await fastify.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Campaign not found" },
      });
    }

    const updated = await fastify.prisma.campaign.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.spend !== undefined ? { spend: body.spend } : {}),
        ...(body.endDate !== undefined
          ? { endDate: body.endDate ? new Date(body.endDate) : null }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });

    return reply.status(200).send({ success: true, data: updated });
  });
}
