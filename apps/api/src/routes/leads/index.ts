import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { canUpdateLead } from "@lms/auth";
import { Role } from "@lms/types";
import { leadListRoute } from "./list";
import { createLeadRoute } from "./create";
import { leadDetailRoute } from "./detail";
import { updateLeadRoute } from "./update";
import { transitionLeadRoute } from "./transition";
import { assignLeadRoute } from "./assign";
import { unassignedLeadsRoute } from "./unassigned";
import { overdueLeadsRoute } from "./overdue";
import { leadFollowUpsRoute } from "./followups";
import { bulkLeadRoutes } from "./bulk";
import { intelBriefRoutes } from "./intelBrief";
import {
  invalidateAnalyticsCache,
  invalidateActivityCache,
} from "../../services/cache";
import { findDuplicateLeads } from "./service";

export async function leadRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(unassignedLeadsRoute);
  await fastify.register(overdueLeadsRoute);
  await fastify.register(leadFollowUpsRoute);
  await fastify.register(bulkLeadRoutes);

  // GET /leads/check-duplicate?phone=XXXXXXXXXX
  fastify.get(
    "/check-duplicate",
    { preHandler: authenticate },
    async (request, reply) => {
      const { phone } = request.query as { phone?: string };
      if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_PHONE",
            message: "Provide a valid 10-digit Indian mobile number",
          },
        });
      }
      const leads = await findDuplicateLeads({ phone, prisma: fastify.prisma });
      return reply.status(200).send({ success: true, data: { leads } });
    },
  );

  await fastify.register(intelBriefRoutes);
  await fastify.register(leadListRoute);
  await fastify.register(createLeadRoute);

  // GET /leads/:id/client-deal
  fastify.get(
    "/:id/client-deal",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const deal = await fastify.prisma.clientDeal.findUnique({
        where: { leadId: id },
        include: { closedBy: { select: { id: true, name: true } } },
      });

      if (!deal) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "No client deal found" },
        });
      }

      return reply.status(200).send({ success: true, data: deal });
    },
  );

  // POST /leads/:id/client-deal
  fastify.post(
    "/:id/client-deal",
    { preHandler: [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])] },
    async (request, reply) => {
      const { id: leadId } = request.params as { id: string };
      const { id: userId, role } = request.user;
      const body = request.body as {
        dealValue: number;
        servicesSold: string[];
        contractStartDate: string;
        quotationLink: string;
      };

      if (!body.dealValue || body.dealValue <= 0) {
        return reply.status(400).send({ success: false, error: { code: "INVALID_INPUT", message: "dealValue must be positive" } });
      }
      if (!Array.isArray(body.servicesSold) || body.servicesSold.length === 0) {
        return reply.status(400).send({ success: false, error: { code: "INVALID_INPUT", message: "servicesSold must be a non-empty array" } });
      }
      if (!body.contractStartDate) {
        return reply.status(400).send({ success: false, error: { code: "INVALID_INPUT", message: "contractStartDate is required" } });
      }
      if (!body.quotationLink) {
        return reply.status(400).send({ success: false, error: { code: "INVALID_INPUT", message: "quotationLink is required" } });
      }

      const lead = await fastify.prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, assignedToId: true, createdById: true, branchId: true, status: true },
      });
      if (!lead) {
        return reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "Lead not found" } });
      }

      if (!canUpdateLead(
        { id: userId, role: role as Role, branchId: request.user.branchId },
        { id: lead.id, assignedToId: lead.assignedToId ?? null, createdById: lead.createdById, branchId: lead.branchId, status: lead.status },
      )) {
        return reply.status(403).send({ success: false, error: { code: "FORBIDDEN", message: "Access denied" } });
      }

      const deal = await fastify.prisma.clientDeal.upsert({
        where: { leadId },
        create: {
          leadId,
          dealValue: body.dealValue,
          servicesSold: body.servicesSold,
          contractStartDate: new Date(body.contractStartDate),
          quotationLink: body.quotationLink,
          closedById: userId,
        },
        update: {
          dealValue: body.dealValue,
          servicesSold: body.servicesSold,
          contractStartDate: new Date(body.contractStartDate),
          quotationLink: body.quotationLink,
          closedById: userId,
        },
        include: { closedBy: { select: { id: true, name: true } } },
      });

      await fastify.prisma.auditLog.create({
        data: {
          leadId,
          userId,
          action: "CLIENT_DEAL_SAVED",
          newValue: { dealValue: body.dealValue, servicesSold: body.servicesSold },
        },
      });

      await invalidateAnalyticsCache(fastify.redis);
      await invalidateActivityCache(fastify.redis, request.user.branchId, userId);

      return reply.status(200).send({ success: true, data: deal });
    },
  );

  // POST /leads/import
  fastify.post(
    "/import",
    { preHandler: [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])] },
    async (request, reply) => {
      const { rows } = request.body as {
        rows: Array<{
          rowIndex: number;
          name?: string | null;
          phone: string;
          email?: string | null;
          instagramUrl?: string | null;
          websiteUrl?: string | null;
          industry?: string | null;
          city?: string | null;
          remarks?: string | null;
          source?: string | null;
        }>;
      };

      const MAX_IMPORT_ROWS = 500;
      if (!Array.isArray(rows) || rows.length === 0) {
        return reply.status(400).send({ success: false, error: { code: "INVALID_INPUT", message: "rows must be a non-empty array" } });
      }
      if (rows.length > MAX_IMPORT_ROWS) {
        return reply.status(400).send({ success: false, error: { code: "TOO_MANY_ROWS", message: `Maximum ${MAX_IMPORT_ROWS} rows per import. Split into smaller batches.` } });
      }

      function normalizeImportPhone(raw: string): string | null {
        const digits = String(raw ?? "").replace(/\D/g, "");
        const fromFloat = digits.length < 5 ? String(Math.round(Number(raw))).replace(/\D/g, "") : digits;
        const candidate = fromFloat.startsWith("91") && fromFloat.length === 12 ? fromFloat.slice(2) : fromFloat;
        return /^[6-9]\d{9}$/.test(candidate) ? candidate : null;
      }

      const { id: userId, branchId } = request.user;

      const allSources = await fastify.prisma.leadSourceType.findMany({
        select: { id: true, name: true },
      });
      const sourceMap = new Map(allSources.map((s) => [s.name.toLowerCase().trim(), s.id]));

      function resolveSourceId(name: string): string | undefined {
        const key = name.toLowerCase().trim();
        if (sourceMap.has(key)) return sourceMap.get(key);
        for (const [dbName, id] of sourceMap.entries()) {
          if (dbName.includes(key) || key.includes(dbName)) return id;
        }
        return undefined;
      }

      const normalizedRows = rows.map((r) => ({
        ...r,
        phone: normalizeImportPhone(r.phone) ?? r.phone,
        email: r.email?.toLowerCase().trim() ?? null,
      }));

      const existingLeads = await fastify.prisma.lead.findMany({
        where: {
          OR: [
            { phone: { in: normalizedRows.map((r) => r.phone).filter(Boolean) } },
            {
              email: {
                in: normalizedRows.map((r) => r.email).filter(Boolean) as string[],
                mode: "insensitive",
              } as any,
            },
          ],
        },
        select: {
          id: true,
          phone: true,
          email: true,
          instagramUrl: true,
          websiteUrl: true,
          status: true,
          isDuplicate: true,
          duplicateOfId: true,
        },
      });

      const { processImportRows } = await import("@lms/core");
      const result = processImportRows(normalizedRows as any, existingLeads as any);

      const created = [];
      const importErrors: Array<{ rowIndex: number; reason: string }> = [];

      for (const row of result.imported) {
        const phone = normalizeImportPhone(row.phone) ?? row.phone;
        if (!/^[6-9]\d{9}$/.test(phone)) {
          importErrors.push({ rowIndex: row.rowIndex, reason: `Invalid phone number: ${row.phone}` });
          continue;
        }

        try {
          const sourceId = row.source ? (resolveSourceId(row.source) ?? null) : null;
          const isProfileComplete = !!(row.instagramUrl && row.websiteUrl);

          const lead = await fastify.prisma.lead.create({
            data: {
              name: row.name ?? null,
              phone,
              email: row.email?.toLowerCase().trim() ?? null,
              instagramUrl: row.instagramUrl ?? null,
              websiteUrl: row.websiteUrl ?? null,
              isProfileComplete,
              industry: row.industry ?? null,
              city: row.city ?? null,
              remarks: row.remarks ?? null,
              sourceId,
              branchId,
              createdById: userId,
              assignedToId: null,
              status: "NEW",
            },
          });

          created.push(lead);
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          importErrors.push({ rowIndex: row.rowIndex, reason });
        }
      }

      return reply.status(200).send({
        success: true,
        data: {
          imported: created,
          duplicateQueue: result.duplicateQueue,
          errors: [...result.errors, ...importErrors],
        },
      });
    },
  );

  await fastify.register(leadDetailRoute);
  await fastify.register(updateLeadRoute);
  await fastify.register(transitionLeadRoute);
  await fastify.register(assignLeadRoute);
}
