import type { FastifyInstance } from "fastify";
import { Prisma } from "@lms/db";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Role } from "@lms/types";
import {
  getDashboardOverview,
  getEmployeePerformance,
  getEmployeeCallLog,
  getEmployeeInteractedLeads,
  getPipelineAnalysis,
  getSourceReport,
  getFollowUpCompliance,
  getConfirmedReport,
  getLeadsAtRisk,
  getWorkloadBalance,
  getClientsNeedingAttention,
  getRevenueForecast,
  getBranchComparison,
  getCampaignPerformance,
} from "./service";
import {
  generateCSV,
  generatePerformancePDF,
  generateConfirmedPDF,
} from "./export";
import { getCached, buildCacheKey } from "./helpers";
import type { Period } from "./helpers";

const CACHE_TTL = 15 * 60; // 15 minutes for most reports
const COMPLIANCE_TTL = 5 * 60; // 5 minutes for follow-up (more real-time)

export async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  // Auth guard — all analytics require sub-admin or admin
  const guard = [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])];

  // SUB_ADMIN is locked to their own branch; ADMIN may query any branch via q.branchId
  function effectiveBranchId(
    role: string,
    userBranchId: string,
    queryBranchId?: string,
  ): string | undefined {
    if (role === Role.SUB_ADMIN) return userBranchId;
    return queryBranchId;
  }

  // ── GET /analytics/dashboard ──
  fastify.get("/dashboard", { preHandler: guard }, async (request, reply) => {
    const q = request.query as {
      period?: Period;
      dateFrom?: string;
      dateTo?: string;
      branchId?: string;
    };
    const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);

    const cacheKey = buildCacheKey("dashboard", {
      period: q.period,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      branchId,
    });

    const data = await getCached(fastify.redis, cacheKey, CACHE_TTL, () =>
      getDashboardOverview({
        prisma: fastify.prisma,
        period: q.period ?? "last30",
        ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
        ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
      }),
    );

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/employees ──
  fastify.get("/employees", { preHandler: guard }, async (request, reply) => {
    const q = request.query as {
      period?: Period;
      dateFrom?: string;
      dateTo?: string;
      branchId?: string;
    };
    const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);

    const cacheKey = buildCacheKey("employees", {
      period: q.period,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      branchId,
    });

    const data = await getCached(fastify.redis, cacheKey, CACHE_TTL, () =>
      getEmployeePerformance({
        prisma: fastify.prisma,
        period: q.period ?? "last30",
        ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
        ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
      }),
    );

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/me ── self-performance, any authenticated role.
  // No ADMIN/SUB_ADMIN guard — an employee may always see their own data.
  fastify.get("/me", { preHandler: authenticate }, async (request, reply) => {
    const q = request.query as { period?: Period; dateFrom?: string; dateTo?: string };

    const data = await getEmployeePerformance({
      prisma: fastify.prisma,
      period: q.period ?? "last30",
      ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
      ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
      employeeId: request.user.id,
    });

    if (data.employees.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "No performance data for this account" },
      });
    }

    return reply.status(200).send({ success: true, data: data.employees[0] });
  });

  // ── GET /analytics/employees/:id ── single employee drill-down
  fastify.get("/employees/:id", { preHandler: guard }, async (request, reply) => {
    const { id: employeeId } = request.params as { id: string };
    const q = request.query as { period?: Period; dateFrom?: string; dateTo?: string };

    const data = await getEmployeePerformance({
      prisma: fastify.prisma,
      period: q.period ?? "last30",
      ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
      ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
      employeeId,
    });

    if (data.employees.length === 0) {
      return reply.status(404).send({ success: false, error: { message: "Employee not found" } });
    }

    return reply.status(200).send({ success: true, data: data.employees[0] });
  });

  // ── GET /analytics/employees/:id/calls — paginated call log behind callCount ──
  fastify.get("/employees/:id/calls", { preHandler: guard }, async (request, reply) => {
    const { id: employeeId } = request.params as { id: string };
    const q = request.query as {
      period?: Period;
      dateFrom?: string;
      dateTo?: string;
      page?: string;
      pageSize?: string;
    };

    const data = await getEmployeeCallLog({
      prisma: fastify.prisma,
      employeeId,
      period: q.period ?? "last30",
      ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
      ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
      ...(q.page !== undefined ? { page: parseInt(q.page, 10) } : {}),
      ...(q.pageSize !== undefined ? { pageSize: parseInt(q.pageSize, 10) } : {}),
    });

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/me/calls — self call log, any authenticated role ──
  fastify.get("/me/calls", { preHandler: authenticate }, async (request, reply) => {
    const q = request.query as {
      period?: Period;
      dateFrom?: string;
      dateTo?: string;
      page?: string;
      pageSize?: string;
    };

    const data = await getEmployeeCallLog({
      prisma: fastify.prisma,
      employeeId: request.user.id,
      period: q.period ?? "last30",
      ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
      ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
      ...(q.page !== undefined ? { page: parseInt(q.page, 10) } : {}),
      ...(q.pageSize !== undefined ? { pageSize: parseInt(q.pageSize, 10) } : {}),
    });

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/employees/:id/interacted-leads — leads behind leadsInteracted ──
  fastify.get(
    "/employees/:id/interacted-leads",
    { preHandler: guard },
    async (request, reply) => {
      const { id: employeeId } = request.params as { id: string };
      const q = request.query as {
        period?: Period;
        dateFrom?: string;
        dateTo?: string;
        page?: string;
        pageSize?: string;
      };

      const data = await getEmployeeInteractedLeads({
        prisma: fastify.prisma,
        employeeId,
        period: q.period ?? "last30",
        ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
        ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
        ...(q.page !== undefined ? { page: parseInt(q.page, 10) } : {}),
        ...(q.pageSize !== undefined ? { pageSize: parseInt(q.pageSize, 10) } : {}),
      });

      return reply.status(200).send({ success: true, data });
    },
  );

  // ── GET /analytics/me/interacted-leads — self version, any authenticated role ──
  fastify.get("/me/interacted-leads", { preHandler: authenticate }, async (request, reply) => {
    const q = request.query as {
      period?: Period;
      dateFrom?: string;
      dateTo?: string;
      page?: string;
      pageSize?: string;
    };

    const data = await getEmployeeInteractedLeads({
      prisma: fastify.prisma,
      employeeId: request.user.id,
      period: q.period ?? "last30",
      ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
      ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
      ...(q.page !== undefined ? { page: parseInt(q.page, 10) } : {}),
      ...(q.pageSize !== undefined ? { pageSize: parseInt(q.pageSize, 10) } : {}),
    });

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/pipeline ──
  fastify.get("/pipeline", { preHandler: guard }, async (request, reply) => {
    const q = request.query as { branchId?: string };
    const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);

    const cacheKey = buildCacheKey("pipeline", { branchId });

    const data = await getCached(fastify.redis, cacheKey, CACHE_TTL, () =>
      getPipelineAnalysis({
        prisma: fastify.prisma,
        ...(branchId !== undefined ? { branchId } : {}),
      }),
    );

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/sources ──
  fastify.get("/sources", { preHandler: guard }, async (request, reply) => {
    const q = request.query as {
      period?: Period;
      dateFrom?: string;
      dateTo?: string;
      branchId?: string;
    };
    const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);

    const cacheKey = buildCacheKey("sources", {
      period: q.period,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      branchId,
    });

    const data = await getCached(fastify.redis, cacheKey, CACHE_TTL, () =>
      getSourceReport({
        prisma: fastify.prisma,
        period: q.period ?? "last30",
        ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
        ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
      }),
    );

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/follow-ups ──
  fastify.get("/follow-ups", { preHandler: guard }, async (request, reply) => {
    const q = request.query as { branchId?: string };
    const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);

    const cacheKey = buildCacheKey("followups", { branchId });

    const data = await getCached(
      fastify.redis,
      cacheKey,
      COMPLIANCE_TTL, // shorter TTL — more real-time
      () =>
        getFollowUpCompliance({
          prisma: fastify.prisma,
          ...(branchId !== undefined ? { branchId } : {}),
        }),
    );

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/revenue — weighted pipeline forecast ──
  fastify.get("/revenue", { preHandler: guard }, async (request, reply) => {
    const q = request.query as { branchId?: string };
    const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);

    const cacheKey = buildCacheKey("revenue", { branchId });
    const data = await getCached(fastify.redis, cacheKey, CACHE_TTL, () =>
      getRevenueForecast({
        prisma: fastify.prisma,
        ...(branchId !== undefined ? { branchId } : {}),
      }),
    );

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/branches — ADMIN only, company-wide comparison ──
  fastify.get(
    "/branches",
    { preHandler: [authenticate, authorize([Role.ADMIN])] },
    async (request, reply) => {
      const q = request.query as { period?: Period };
      const cacheKey = buildCacheKey("branches", { period: q.period });
      const data = await getCached(fastify.redis, cacheKey, CACHE_TTL, () =>
        getBranchComparison({ prisma: fastify.prisma, period: q.period ?? "last30" }),
      );

      return reply.status(200).send({ success: true, data });
    },
  );

  // ── GET /analytics/campaigns — per-campaign revenue/ROI ──
  fastify.get("/campaigns", { preHandler: guard }, async (request, reply) => {
    const q = request.query as { branchId?: string };
    const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);

    const cacheKey = buildCacheKey("campaigns", { branchId });
    const data = await getCached(fastify.redis, cacheKey, CACHE_TTL, () =>
      getCampaignPerformance({
        prisma: fastify.prisma,
        ...(branchId !== undefined ? { branchId } : {}),
      }),
    );

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/workload — SubAdmin/Admin only ──
  fastify.get("/workload", { preHandler: guard }, async (request, reply) => {
    const q = request.query as { branchId?: string };
    const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);

    const cacheKey = buildCacheKey("workload", { branchId });
    const data = await getCached(fastify.redis, cacheKey, CACHE_TTL, () =>
      getWorkloadBalance({
        prisma: fastify.prisma,
        ...(branchId !== undefined ? { branchId } : {}),
      }),
    );

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/clients-at-risk — CLIENT deals gone quiet ──
  fastify.get("/clients-at-risk", { preHandler: guard }, async (request, reply) => {
    const q = request.query as { branchId?: string; staleDays?: string };
    const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);
    const staleDays = q.staleDays ? parseInt(q.staleDays, 10) : undefined;

    const cacheKey = buildCacheKey("clients-at-risk", { branchId, staleDays: q.staleDays });
    const data = await getCached(fastify.redis, cacheKey, CACHE_TTL, () =>
      getClientsNeedingAttention({
        prisma: fastify.prisma,
        ...(branchId !== undefined ? { branchId } : {}),
        ...(staleDays !== undefined ? { staleDays } : {}),
      }),
    );

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/leads-at-risk ──
  // Available to all authenticated roles: employees are auto-scoped to their
  // own leads (they can't pass assignedToId), managers get the usual
  // branch-lock via effectiveBranchId() and may filter by any employee.
  fastify.get("/leads-at-risk", { preHandler: authenticate }, async (request, reply) => {
    const q = request.query as {
      branchId?: string;
      assignedToId?: string;
      staleDays?: string;
    };
    const staleDays = q.staleDays ? parseInt(q.staleDays, 10) : undefined;

    let branchId: string | undefined;
    let assignedToId: string | undefined;

    if (request.user.role === Role.EMPLOYEE) {
      assignedToId = request.user.id;
    } else {
      branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);
      assignedToId = q.assignedToId;
    }

    const data = await getLeadsAtRisk({
      prisma: fastify.prisma,
      ...(branchId !== undefined ? { branchId } : {}),
      ...(assignedToId !== undefined ? { assignedToId } : {}),
      ...(staleDays !== undefined ? { staleDays } : {}),
    });

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/confirmed ──
  fastify.get("/confirmed", { preHandler: guard }, async (request, reply) => {
    const q = request.query as {
      period?: Period;
      dateFrom?: string;
      dateTo?: string;
      branchId?: string;
    };
    const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);

    const cacheKey = buildCacheKey("confirmed", {
      period: q.period,
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      branchId,
    });

    const data = await getCached(fastify.redis, cacheKey, CACHE_TTL, () =>
      getConfirmedReport({
        prisma: fastify.prisma,
        period: q.period ?? "last30",
        ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
        ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
      }),
    );

    return reply.status(200).send({ success: true, data });
  });

  // ── GET /analytics/export/csv/:type ──
  fastify.get(
    "/export/csv/:type",
    { preHandler: guard },
    async (request, reply) => {
      const { type } = request.params as { type: string };
      const q = request.query as {
        period?: Period;
        dateFrom?: string;
        dateTo?: string;
        branchId?: string;
      };
      const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);

      let csv = "";
      let filename = "";

      if (type === "employees") {
        const data = await getEmployeePerformance({
          prisma: fastify.prisma,
          period: q.period ?? "last30",
          ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
          ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
          ...(branchId !== undefined ? { branchId } : {}),
        });

        const rows = data.employees.map((e) => ({
          Name: e.employee.name,
          Email: e.employee.email,
          "Total Assigned": e.metrics.totalAssigned,
          Clients: e.metrics.confirmed,
          "Close Rate %": e.metrics.confirmationRate,
          "Avg Response Hours": e.metrics.avgResponseHours ?? "N/A",
          "Overdue Follow-ups": e.metrics.overdueFollowUps,
          "Compliance Rate %": e.metrics.followUpComplianceRate,
          "Performance Score": e.metrics.performanceScore,
        }));

        csv = generateCSV(Object.keys(rows[0] ?? {}), rows);
        filename = "employee-performance.csv";
      } else if (type === "confirmed") {
        const data = await getConfirmedReport({
          prisma: fastify.prisma,
          period: q.period ?? "last30",
          ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
          ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
          ...(branchId !== undefined ? { branchId } : {}),
        });

        const rows = data.leads.map((l) => ({
          Name: l.name ?? "",
          Phone: l.phone,
          Services: l.servicesSold.join(", "),
          Counsellor: l.assignedTo?.name ?? "",
          "Closed At": l.confirmedAt?.toDateString() ?? "",
          "Deal Value": l.dealValue,
          "Contract Start": l.contractStartDate?.toDateString() ?? "",
        }));

        csv = generateCSV(Object.keys(rows[0] ?? {}), rows);
        filename = "client-deals.csv";
      } else if (type === "pipeline") {
        const data = await getPipelineAnalysis({
          prisma: fastify.prisma,
          ...(branchId !== undefined ? { branchId } : {}),
        });

        const rows = data.statusBreakdown.map((s) => ({
          Status: s.status,
          Count: s.count,
          "Avg Days in Stage": s.avgDaysInStage ?? "N/A",
        }));

        csv = generateCSV(["Status", "Count", "Avg Days in Stage"], rows);
        filename = "pipeline-snapshot.csv";
      } else if (type === "sources") {
        const data = await getSourceReport({
          prisma: fastify.prisma,
          period: q.period ?? "last30",
          ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
          ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
          ...(branchId !== undefined ? { branchId } : {}),
        });

        const rows = data.sources.map((s) => ({
          Source: s.source.name,
          Leads: s.total,
          Clients: s.confirmed,
          Lost: s.lost,
          "Conversion Rate %": s.conversionRate,
        }));

        csv = generateCSV(["Source", "Leads", "Clients", "Lost", "Conversion Rate %"], rows);
        filename = "source-performance.csv";
      } else {
        return reply.status(400).send({
          success: false,
          error: { code: "INVALID_INPUT", message: "Invalid export type" },
        });
      }

      void reply
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(csv);
    },
  );

  // GET /analytics/trend
  fastify.get("/trend", { preHandler: guard }, async (request, reply) => {
    const q = request.query as {
      period?: string;
      branchId?: string;
    };

    const days = q.period === "last90" ? 90 : q.period === "last30" ? 30 : 7;
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);

    type TrendRow = { day: Date; cnt: bigint };

    const branchClause = branchId
      ? Prisma.sql`AND "branchId" = ${branchId}`
      : Prisma.empty;

    const [created, confirmed] = await Promise.all([
      fastify.prisma.$queryRaw<TrendRow[]>(Prisma.sql`
        SELECT DATE("createdAt" AT TIME ZONE 'UTC') AS day, COUNT(*)::bigint AS cnt
        FROM "Lead"
        WHERE "createdAt" >= ${from}
        ${branchClause}
        GROUP BY day
        ORDER BY day
      `),
      fastify.prisma.$queryRaw<TrendRow[]>(Prisma.sql`
        SELECT DATE("confirmedAt" AT TIME ZONE 'UTC') AS day, COUNT(*)::bigint AS cnt
        FROM "Lead"
        WHERE status = 'CLIENT'
          AND "confirmedAt" >= ${from}
        ${branchClause}
        GROUP BY day
        ORDER BY day
      `),
    ]);

    // Build date scaffold
    const dateMap: Record<string, { created: number; confirmed: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0]!;
      dateMap[key] = { created: 0, confirmed: 0 };
    }

    for (const row of created) {
      const key = new Date(row.day).toISOString().split("T")[0]!;
      if (dateMap[key]) dateMap[key]!.created += Number(row.cnt);
    }
    for (const row of confirmed) {
      const key = new Date(row.day).toISOString().split("T")[0]!;
      if (dateMap[key]) dateMap[key]!.confirmed += Number(row.cnt);
    }

    const trend = Object.entries(dateMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    return reply.status(200).send({ success: true, data: { trend } });
  });

  // ── GET /analytics/export/pdf/:type ──
  fastify.get(
    "/export/pdf/:type",
    { preHandler: guard },
    async (request, reply) => {
      const { type } = request.params as { type: string };
      const q = request.query as {
        period?: Period;
        dateFrom?: string;
        dateTo?: string;
        branchId?: string;
      };
      const branchId = effectiveBranchId(request.user.role, request.user.branchId, q.branchId);

      void reply.header("Content-Type", "application/pdf");

      if (type === "employees") {
        const data = await getEmployeePerformance({
          prisma: fastify.prisma,
          period: q.period ?? "last30",
          ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
          ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
          ...(branchId !== undefined ? { branchId } : {}),
        });

        void reply.header(
          "Content-Disposition",
          'attachment; filename="employee-performance.pdf"',
        );
        generatePerformancePDF(data, reply.raw);
      } else if (type === "confirmed") {
        const data = await getConfirmedReport({
          prisma: fastify.prisma,
          period: q.period ?? "last30",
          ...(q.dateFrom !== undefined ? { dateFrom: q.dateFrom } : {}),
          ...(q.dateTo !== undefined ? { dateTo: q.dateTo } : {}),
          ...(branchId !== undefined ? { branchId } : {}),
        });

        void reply.header(
          "Content-Disposition",
          'attachment; filename="confirmed-applications.pdf"',
        );
        generateConfirmedPDF(data, reply.raw);
      } else {
        return reply.status(400).send({
          success: false,
          error: { code: "INVALID_INPUT", message: "Invalid export type" },
        });
      }
    },
  );
}
