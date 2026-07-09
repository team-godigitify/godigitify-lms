import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { Role, TargetScope, TargetMetric } from "@lms/types";
import { invalidateAnalyticsCache } from "../../services/cache";
import { getTargetProgress, getTargetInteractions } from "./service";

// A Target is a goal for one metric over one period, scoped to the whole
// company, one branch, or one employee (PRD §16). Read access is broader
// than write access: an employee may always see their own target; only
// managers can set targets, and only within their own scope.
//
// COMPANY-scope targets use a sentinel scopeId instead of null: Postgres
// treats NULL as distinct from NULL in unique constraints, so ON CONFLICT
// (used by Prisma's upsert) would never match an existing null-scopeId row
// and every "update" would silently insert a duplicate.
const COMPANY_SCOPE_ID = "__company__";

// Same always-safe base WHERE for every read route: a caller can only ever
// narrow their own allowed set via query params, never broaden it (e.g. a
// bare `GET /targets` with no params must never return another branch's or
// the company's targets to a SUB_ADMIN).
async function getVisibilityFilter(
  fastify: FastifyInstance,
  role: Role,
  userId: string,
  userBranchId: string,
): Promise<Record<string, unknown>> {
  if (role === Role.EMPLOYEE) {
    return { scope: TargetScope.EMPLOYEE, scopeId: userId };
  }
  if (role === Role.SUB_ADMIN) {
    const employeeIds = (
      await fastify.prisma.user.findMany({
        where: { branchId: userBranchId, role: Role.EMPLOYEE },
        select: { id: true },
      })
    ).map((u) => u.id);

    return {
      OR: [
        { scope: TargetScope.BRANCH, scopeId: userBranchId },
        { scope: TargetScope.EMPLOYEE, scopeId: { in: employeeIds } },
      ],
    };
  }
  return {}; // ADMIN — unrestricted
}

export async function targetRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /targets ── any authenticated role, scope-limited per role.
  fastify.get("/", { preHandler: authenticate }, async (request, reply) => {
    const q = request.query as {
      scope?: string;
      scopeId?: string;
      metric?: string;
      period?: string;
    };
    const { role, id: userId, branchId: userBranchId } = request.user;

    const baseWhere = await getVisibilityFilter(fastify, role as Role, userId, userBranchId);

    const narrowing: Record<string, unknown> = {};
    if (q.scope) narrowing.scope = q.scope as TargetScope;
    if (q.scopeId) narrowing.scopeId = q.scopeId;
    if (q.metric) narrowing.metric = q.metric as TargetMetric;
    if (q.period) narrowing.period = q.period;

    const targets = await fastify.prisma.target.findMany({
      where: { AND: [baseWhere, narrowing] },
      orderBy: { period: "desc" },
    });

    return reply.status(200).send({ success: true, data: { targets } });
  });

  // ── GET /targets/history ── every visible target plus its actual
  // progress (achieved value, status, leads/calls/meetings breakdown) —
  // the "did we hit it" view the plain list above doesn't answer.
  fastify.get("/history", { preHandler: authenticate }, async (request, reply) => {
    const q = request.query as {
      scope?: string;
      scopeId?: string;
      metric?: string;
      period?: string;
    };
    const { role, id: userId, branchId: userBranchId } = request.user;

    const baseWhere = await getVisibilityFilter(fastify, role as Role, userId, userBranchId);

    const narrowing: Record<string, unknown> = {};
    if (q.scope) narrowing.scope = q.scope as TargetScope;
    if (q.scopeId) narrowing.scopeId = q.scopeId;
    if (q.metric) narrowing.metric = q.metric as TargetMetric;
    if (q.period) narrowing.period = q.period;

    const targets = await fastify.prisma.target.findMany({
      where: { AND: [baseWhere, narrowing] },
      orderBy: { period: "desc" },
    });

    const history = await Promise.all(
      targets.map(async (t) => ({
        ...t,
        progress: await getTargetProgress({
          prisma: fastify.prisma,
          scope: t.scope as TargetScope,
          scopeId: t.scopeId ?? "",
          metric: t.metric as TargetMetric,
          period: t.period,
          value: Number(t.value),
        }),
      })),
    );

    return reply.status(200).send({ success: true, data: { history } });
  });

  // ── GET /targets/:id/interactions ── individual CALL/MEETING rows behind
  // a target's breakdown chips. Visibility-checked the same way as the list
  // above — a caller can only pull the breakdown of a target they could see.
  fastify.get("/:id/interactions", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const q = request.query as { type?: string; page?: string; pageSize?: string };
    const { role, id: userId, branchId: userBranchId } = request.user;

    const baseWhere = await getVisibilityFilter(fastify, role as Role, userId, userBranchId);
    const target = await fastify.prisma.target.findFirst({ where: { AND: [{ id }, baseWhere] } });

    if (!target) {
      return reply.status(404).send({ success: false, error: { message: "Target not found" } });
    }

    const type = q.type === "MEETING" ? "MEETING" : "CALL";

    const data = await getTargetInteractions({
      prisma: fastify.prisma,
      scope: target.scope as TargetScope,
      scopeId: target.scopeId ?? "",
      period: target.period,
      type,
      ...(q.page !== undefined ? { page: parseInt(q.page, 10) } : {}),
      ...(q.pageSize !== undefined ? { pageSize: parseInt(q.pageSize, 10) } : {}),
    });

    return reply.status(200).send({ success: true, data });
  });

  // ── POST /targets ── create/update — ADMIN or SUB_ADMIN (own branch/employees only)
  fastify.post(
    "/",
    { preHandler: [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])] },
    async (request, reply) => {
      const body = request.body as {
        scope: string;
        scopeId?: string;
        metric: string;
        period: string;
        value: number;
      };
      const { role, id: userId, branchId: userBranchId } = request.user;

      if (body.scope !== TargetScope.COMPANY && !body.scopeId) {
        return reply.status(400).send({
          success: false,
          error: { code: "INVALID_INPUT", message: "scopeId is required for BRANCH/EMPLOYEE targets" },
        });
      }

      if (role === Role.SUB_ADMIN) {
        if (body.scope === TargetScope.COMPANY) {
          return reply.status(403).send({
            success: false,
            error: { code: "FORBIDDEN", message: "Only ADMIN can set company targets" },
          });
        }
        if (body.scope === TargetScope.BRANCH && body.scopeId !== userBranchId) {
          return reply.status(403).send({
            success: false,
            error: { code: "FORBIDDEN", message: "Can only set your own branch's target" },
          });
        }
        if (body.scope === TargetScope.EMPLOYEE) {
          const employee = body.scopeId
            ? await fastify.prisma.user.findUnique({
                where: { id: body.scopeId },
                select: { branchId: true },
              })
            : null;
          if (!employee || employee.branchId !== userBranchId) {
            return reply.status(403).send({
              success: false,
              error: { code: "FORBIDDEN", message: "Employee is not in your branch" },
            });
          }
        }
      }

      const scopeId =
        body.scope === TargetScope.COMPANY ? COMPANY_SCOPE_ID : (body.scopeId ?? null);

      const target = await fastify.prisma.target.upsert({
        where: {
          scope_scopeId_metric_period: {
            scope: body.scope as TargetScope,
            scopeId: scopeId as string,
            metric: body.metric as TargetMetric,
            period: body.period,
          },
        },
        create: {
          scope: body.scope as TargetScope,
          scopeId,
          metric: body.metric as TargetMetric,
          period: body.period,
          value: body.value,
          createdById: userId,
        },
        update: { value: body.value },
      });

      await invalidateAnalyticsCache(fastify.redis);

      return reply.status(200).send({ success: true, data: target });
    },
  );

  // ── DELETE /targets/:id ── ADMIN only
  fastify.delete(
    "/:id",
    { preHandler: [authenticate, authorize([Role.ADMIN])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await fastify.prisma.target.delete({ where: { id } }).catch(() => null);
      await invalidateAnalyticsCache(fastify.redis);
      return reply.status(200).send({ success: true, data: { message: "Target removed" } });
    },
  );
}
