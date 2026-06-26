import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Role } from "@lms/types";
import { QUEUES } from "../../plugins/bullmq";

export async function intelBriefRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /leads/:id/intel-brief — fetch current brief
  fastify.get(
    "/:id/intel-brief",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const brief = await fastify.prisma.intelBrief.findUnique({
        where: { leadId: id },
        select: {
          id: true,
          status: true,
          validatedOutput: true,
          aiModelUsed: true,
          retryCount: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!brief) {
        return reply.status(404).send({ success: false, error: { message: "Intel Brief not generated yet" } });
      }

      return reply.send({ success: true, data: brief });
    },
  );

  // POST /leads/:id/intel-brief/generate — trigger or re-trigger generation
  fastify.post(
    "/:id/intel-brief/generate",
    { preHandler: [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])] },
    async (request, reply) => {
      const { id: leadId } = request.params as { id: string };

      const lead = await fastify.prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          name: true,
          instagramUrl: true,
          websiteUrl: true,
          industry: true,
          dealSizeEstimate: true,
          isProfileComplete: true,
        },
      });

      if (!lead) {
        return reply.status(404).send({ success: false, error: { message: "Lead not found" } });
      }

      // Remove any existing failed/stale job so this retry is always a fresh run
      await fastify.queues[QUEUES.INTEL_BRIEF].remove(`intel-brief-${leadId}`).catch(() => null);

      // Reset brief to PENDING so UI reflects the new attempt immediately
      await fastify.prisma.intelBrief.updateMany({
        where: { leadId },
        data: { status: "PENDING", retryCount: 0 },
      });

      await fastify.queues[QUEUES.INTEL_BRIEF].add(
        "generate",
        {
          leadId: lead.id,
          name: lead.name,
          instagramUrl: lead.instagramUrl,
          websiteUrl: lead.websiteUrl,
          industry: lead.industry,
          dealSizeEstimate: lead.dealSizeEstimate ? Number(lead.dealSizeEstimate) : null,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 30_000 },
          jobId: `intel-brief-${leadId}-${Date.now()}`,
        },
      );

      return reply.status(202).send({ success: true, data: { queued: true } });
    },
  );
}
