import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { canUpdateLead } from "@lms/auth";
import { Role, UpdateLeadSchema } from "@lms/types";
import { validateBody } from "../../middleware/validate";
import { recomputeLeadScore } from "../../services/leadScoring";

export async function updateLeadRoute(fastify: FastifyInstance): Promise<void> {
  fastify.patch(
    "/:id",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { id: userId, role } = request.user;

      const lead = await fastify.prisma.lead.findUnique({
        where: { id },
        select: {
          id: true,
          assignedTo: { select: { id: true } },
          createdBy: { select: { id: true } },
          branchId: true,
          status: true,
        },
      });

      if (!lead) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Lead not found" },
        });
      }

      const canUpdate = canUpdateLead(
        { id: userId, role: role as Role, branchId: request.user.branchId },
        {
          id: lead.id,
          assignedToId: lead.assignedTo?.id ?? null,
          createdById: lead.createdBy.id,
          branchId: lead.branchId,
          status: lead.status,
        },
      );

      if (!canUpdate) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "You cannot update this lead" },
        });
      }

      const validation = validateBody(UpdateLeadSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ success: false, ...validation.error });
      }
      const body = validation.data;

      // Pull out fields that must not reach lead.update()
      const {
        id: _id,
        status: _status,
        assignedToId: _assigned,
        branchId: _branch,
        createdById: _creator,
        isDuplicate: _dup,
        duplicateOfId: _dupOf,
        confirmedAt: _conf,
        confirmedById: _confBy,
        nextFollowUpAt,      // needs Date conversion
        ...rest
      } = body as Record<string, unknown>;

      // Build the Prisma-safe update payload
      const leadData: Record<string, unknown> = { ...rest };
      if (nextFollowUpAt !== undefined) {
        leadData.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt as string) : null;
      }

      const updated = await fastify.prisma.$transaction(async (tx) => {
        const updatedLead = await tx.lead.update({
          where: { id },
          data: leadData as any,
        });

        await tx.auditLog.create({
          data: {
            leadId: id,
            userId,
            action: "LEAD_UPDATED",
            newValue: leadData as Record<string, string | number | boolean | null>,
          },
        });

        return updatedLead;
      });

      await recomputeLeadScore(fastify.prisma, id);

      return reply.status(200).send({ success: true, data: updated });
    },
  );
}
