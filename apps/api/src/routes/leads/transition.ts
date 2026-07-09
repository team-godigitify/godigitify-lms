import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { canTransitionLead } from "@lms/auth";
import { transitionLead, getValidTransitions } from "@lms/core";
import { LeadStatus, Role, TransitionLeadSchema } from "@lms/types";
import { validateBody } from "../../middleware/validate";
import {
  invalidateAnalyticsCache,
  invalidateActivityCache,
} from "../../services/cache";
import { recomputeLeadScore } from "../../services/leadScoring";

export async function transitionLeadRoute(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post(
    "/:id/transition",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { id: userId, role } = request.user;
      const validation = validateBody(TransitionLeadSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ success: false, ...validation.error });
      }
      const { toStatus, note } = validation.data;

      const lead = await fastify.prisma.lead.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          assignedTo: { select: { id: true } },
          createdBy: { select: { id: true } },
          branchId: true,
          clientDeal: { select: { id: true } },
        },
      });

      if (!lead) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Lead not found" },
        });
      }

      const canTransition = canTransitionLead(
        { id: userId, role: role as Role, branchId: request.user.branchId },
        {
          id: lead.id,
          assignedToId: lead.assignedTo?.id ?? null,
          createdById: lead.createdBy.id,
          branchId: lead.branchId,
          status: lead.status,
        },
      );

      if (!canTransition) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "You cannot update this lead" },
        });
      }

      // Block CLIENT transition unless a ClientDeal exists
      if (toStatus === LeadStatus.CLIENT && !lead.clientDeal) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "CLIENT_DEAL_REQUIRED",
            message: "A client deal must be submitted before closing as CLIENT",
            details: { redirectTo: "client-deal-form" },
          },
        });
      }

      // State machine validation
      const result = transitionLead(lead.status as LeadStatus, toStatus);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: result.error.code,
            message: result.error.message,
            details: {
              validTransitions: getValidTransitions(lead.status as LeadStatus),
            },
          },
        });
      }

      const previousStatus = lead.status as LeadStatus;
      const isClosing = toStatus === LeadStatus.CLIENT;

      await fastify.prisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id },
          data: {
            status: toStatus,
            ...(isClosing ? { confirmedAt: new Date(), confirmedById: userId } : {}),
          },
        });

        await tx.interactionLog.create({
          data: {
            leadId: id,
            userId,
            type: "STATUS_CHANGED",
            note: note ?? null,
            statusBefore: previousStatus,
            statusAfter: toStatus,
          },
        });

        await tx.auditLog.create({
          data: {
            leadId: id,
            userId,
            action: "STATUS_CHANGED",
            oldValue: { status: previousStatus },
            newValue: { status: toStatus },
          },
        });
      });

      await recomputeLeadScore(fastify.prisma, id);
      await invalidateAnalyticsCache(fastify.redis);
      await invalidateActivityCache(
        fastify.redis,
        request.user.branchId,
        request.user.id,
      );

      return reply.status(200).send({
        success: true,
        data: { previousStatus, newStatus: toStatus },
      });
    },
  );
}
