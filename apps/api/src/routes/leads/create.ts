import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import {
  checkDuplicate,
  buildDuplicateContinuation,
  buildLostLeadRevival,
} from "@lms/core";
import { LeadStatus } from "@lms/types";
import { findDuplicateLeads } from "./service";
import { CreateLeadSchema } from "@lms/types";
import { validateBody } from "../../middleware/validate";
import {
  invalidateAnalyticsCache,
  invalidateActivityCache,
} from "../../services/cache";
import { QUEUES } from "../../plugins/bullmq";

export async function createLeadRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/",
    { preHandler: authenticate },
    async (request, reply) => {
      const validation = validateBody(CreateLeadSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ success: false, ...validation.error });
      }
      const body = validation.data;
      const { id: userId, role, branchId } = request.user;

      // ── Step 1: Duplicate detection ──
      const existingLeads = await findDuplicateLeads({
        phone: body.phone,
        email: body.email ?? null,
        instagramUrl: body.instagramUrl ?? null,
        websiteUrl: body.websiteUrl ?? null,
        prisma: fastify.prisma,
      });

      if (existingLeads.length > 0) {
        const duplicateResult = checkDuplicate(
          {
            phone: body.phone,
            email: body.email ?? null,
            instagramUrl: body.instagramUrl ?? null,
            websiteUrl: body.websiteUrl ?? null,
          },
          existingLeads.map((l) => ({
            ...l,
            status: l.status as unknown as LeadStatus,
          })),
        );

        if (duplicateResult.isDuplicate) {
          const existing = existingLeads.find(
            (l) => l.id === duplicateResult.existingLeadId,
          );

          // ── LOST lead revival ──
          if (existing?.status === LeadStatus.LOST) {
            if (!body.confirmRevival) {
              const revivalPrompt = buildLostLeadRevival({
                lostLeadId: duplicateResult.originalLeadId,
                lostLeadName: existing.name ?? null,
                incomingName: body.name ?? null,
                incomingSourceName: null,
              });
              return reply.status(200).send({
                success: true,
                data: { requiresAction: "REVIVAL_CONFIRMATION", ...revivalPrompt },
              });
            }

            // User confirmed revival
            await fastify.prisma.$transaction(async (tx) => {
              await tx.lead.update({
                where: { id: duplicateResult.originalLeadId },
                data: { status: LeadStatus.ATTEMPTED_CONTACT },
              });
              await tx.interactionLog.create({
                data: {
                  leadId: duplicateResult.originalLeadId,
                  userId,
                  type: "NOTE",
                  note: `Lead revived. New enquiry received from "${body.name ?? body.phone}". Continuing follow-up.`,
                  statusBefore: LeadStatus.LOST,
                  statusAfter: LeadStatus.ATTEMPTED_CONTACT,
                },
              });
              await tx.auditLog.create({
                data: {
                  leadId: duplicateResult.originalLeadId,
                  userId,
                  action: "LEAD_REVIVED",
                  oldValue: { status: "LOST" },
                  newValue: { status: "ATTEMPTED_CONTACT" },
                },
              });
            });

            await invalidateAnalyticsCache(fastify.redis);
            await invalidateActivityCache(fastify.redis, branchId, userId);

            const revivedLead = await fastify.prisma.lead.findUnique({
              where: { id: duplicateResult.originalLeadId },
            });
            return reply.status(200).send({
              success: true,
              data: { revivedLead, action: "LEAD_REVIVED" },
            });
          }

          // ── Active duplicate — redirect to original ──
          const continuation = buildDuplicateContinuation({
            matchType: duplicateResult.matchType,
            incomingName: body.name ?? null,
            incomingSourceName: null,
            incomingFollowUpAt: body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null,
            originalLeadId: duplicateResult.originalLeadId,
          });

          await fastify.prisma.$transaction(async (tx) => {
            await tx.interactionLog.create({
              data: {
                leadId: continuation.existingLeadId,
                userId,
                type: "NOTE",
                note: continuation.continuationNote,
              },
            });

            if (continuation.newFollowUpAt) {
              await tx.lead.update({
                where: { id: continuation.existingLeadId },
                data: { nextFollowUpAt: continuation.newFollowUpAt },
              });
            }
          });

          await invalidateAnalyticsCache(fastify.redis);
          await invalidateActivityCache(fastify.redis, branchId, userId);

          return reply.status(200).send({
            success: true,
            data: {
              requiresAction: "DUPLICATE_REDIRECTED",
              existingLeadId: duplicateResult.originalLeadId,
              matchType: duplicateResult.matchType,
              message: "Duplicate detected. Enquiry added to existing lead.",
            },
          });
        }
      }

      // ── Step 2: Resolve assignee ──
      const assignedToId: string | null =
        role === "EMPLOYEE" ? userId : (body.assignedToId ?? null);

      // isProfileComplete: false when either URL is missing (Meta leads land incomplete)
      const isProfileComplete = !!(body.instagramUrl && body.websiteUrl);

      // ── Step 3: Create lead ──
      const lead = await fastify.prisma.$transaction(async (tx) => {
        const newLead = await tx.lead.create({
          data: {
            name: body.name ?? null,
            phone: body.phone,
            email: body.email?.toLowerCase().trim() ?? null,
            instagramUrl: body.instagramUrl ?? null,
            websiteUrl: body.websiteUrl ?? null,
            isProfileComplete,
            industry: body.industry ?? null,
            ...(body.leadPriority ? { leadPriority: body.leadPriority } : {}),
            dealSizeEstimate: body.dealSizeEstimate ?? null,
            city: body.city ?? null,
            sourceId: body.sourceId ?? null,
            sourceOther: body.sourceOther ?? null,
            remarks: body.remarks ?? null,
            nextFollowUpAt: body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null,
            branchId,
            createdById: userId,
            assignedToId: assignedToId ?? null,
            status: LeadStatus.NEW,
          },
        });

        await tx.auditLog.create({
          data: {
            leadId: newLead.id,
            userId,
            action: "LEAD_CREATED",
            newValue: { name: body.name ?? null, phone: body.phone },
          },
        });

        await tx.interactionLog.create({
          data: {
            leadId: newLead.id,
            userId,
            type: "NOTE",
            note: "Lead created",
            statusAfter: LeadStatus.NEW,
          },
        });

        return newLead;
      });

      await invalidateAnalyticsCache(fastify.redis);
      await invalidateActivityCache(fastify.redis, branchId, userId);

      // Queue Intel Brief when profile is complete (both URLs provided)
      if (isProfileComplete) {
        void fastify.queues[QUEUES.INTEL_BRIEF].add(
          "generate",
          {
            leadId: lead.id,
            name: lead.name,
            instagramUrl: body.instagramUrl ?? null,
            websiteUrl: body.websiteUrl ?? null,
            industry: body.industry ?? null,
            dealSizeEstimate: body.dealSizeEstimate ? Number(body.dealSizeEstimate) : null,
          },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 30_000 },
            jobId: `intel-brief-${lead.id}`,
          },
        ).catch((err) => console.error("[intel-brief] Failed to queue:", err));
      }

      return reply.status(201).send({ success: true, data: { lead } });
    },
  );
}
