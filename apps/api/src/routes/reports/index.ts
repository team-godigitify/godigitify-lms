import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Role } from "@lms/types";
import {
  getEmployeePerformance,
  getConfirmedReport,
  getPipelineAnalysis,
  getSourceReport,
} from "../analytics/service";
import type { Period } from "../analytics/helpers";

// A "report" is just a named, saved combination of an existing analytics
// service function + filters (+ an optional schedule) — stored as a
// SavedView row with entity: "report" rather than a dedicated model, so
// there's exactly one calculation path per report type (PRD §19/§9):
// running a report calls the same function the dashboard card/table does.
const REPORT_TYPES = ["employees", "confirmed", "pipeline", "sources"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

function effectiveBranchId(role: string, userBranchId: string, queryBranchId?: string) {
  if (role === Role.SUB_ADMIN) return userBranchId;
  return queryBranchId;
}

export async function reportRoutes(fastify: FastifyInstance): Promise<void> {
  const guard = [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])];

  // ── GET /reports ── saved report definitions the caller created
  fastify.get("/", { preHandler: guard }, async (request, reply) => {
    const reports = await fastify.prisma.savedView.findMany({
      where: { userId: request.user.id, entity: "report" },
      orderBy: { createdAt: "desc" },
    });
    return reply.status(200).send({ success: true, data: { reports } });
  });

  // ── POST /reports ── save a report definition
  fastify.post("/", { preHandler: guard }, async (request, reply) => {
    const body = request.body as {
      name: string;
      type: string;
      period?: string;
      branchId?: string;
      schedule?: "none" | "weekly" | "monthly";
    };

    if (!body.name?.trim() || !REPORT_TYPES.includes(body.type as ReportType)) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_INPUT", message: "name and a valid type are required" },
      });
    }

    const report = await fastify.prisma.savedView.create({
      data: {
        userId: request.user.id,
        entity: "report",
        name: body.name.trim(),
        filters: {
          type: body.type,
          period: body.period ?? "last30",
          branchId: body.branchId ?? null,
          schedule: body.schedule ?? "none",
        },
      },
    });

    return reply.status(201).send({ success: true, data: report });
  });

  // ── DELETE /reports/:id ──
  fastify.delete("/:id", { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const report = await fastify.prisma.savedView.findUnique({ where: { id } });
    if (!report || report.userId !== request.user.id || report.entity !== "report") {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Report not found" },
      });
    }
    await fastify.prisma.savedView.delete({ where: { id } });
    return reply.status(200).send({ success: true, data: { message: "Report deleted" } });
  });

  // ── GET /reports/:id/run ── dispatches to the matching service function
  fastify.get("/:id/run", { preHandler: guard }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const report = await fastify.prisma.savedView.findUnique({ where: { id } });
    if (!report || report.userId !== request.user.id || report.entity !== "report") {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Report not found" },
      });
    }

    const filters = report.filters as { type: ReportType; period?: Period; branchId?: string };
    const branchId = effectiveBranchId(
      request.user.role,
      request.user.branchId,
      filters.branchId ?? undefined,
    );
    const period = filters.period ?? "last30";

    let data: unknown;
    switch (filters.type) {
      case "employees":
        data = await getEmployeePerformance({
          prisma: fastify.prisma,
          period,
          ...(branchId !== undefined ? { branchId } : {}),
        });
        break;
      case "confirmed":
        data = await getConfirmedReport({
          prisma: fastify.prisma,
          period,
          ...(branchId !== undefined ? { branchId } : {}),
        });
        break;
      case "pipeline":
        data = await getPipelineAnalysis({
          prisma: fastify.prisma,
          ...(branchId !== undefined ? { branchId } : {}),
        });
        break;
      case "sources":
        data = await getSourceReport({
          prisma: fastify.prisma,
          period,
          ...(branchId !== undefined ? { branchId } : {}),
        });
        break;
    }

    return reply.status(200).send({ success: true, data: { report, result: data } });
  });
}
