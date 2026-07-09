import type { PrismaClient } from "@lms/db";
import { TargetScope, TargetMetric } from "@lms/types";

// Targets are always monthly ("YYYY-MM") — see the admin UI at
// /analytics/targets, which only ever writes that format.
function parsePeriod(period: string): { from: Date; to: Date } {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1;
  const from = new Date(year, month, 1, 0, 0, 0, 0);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

function leadScopeFilter(scope: TargetScope, scopeId: string): Record<string, unknown> {
  if (scope === TargetScope.BRANCH) return { branchId: scopeId };
  if (scope === TargetScope.EMPLOYEE) return { assignedToId: scopeId };
  return {};
}

function interactionScopeFilter(scope: TargetScope, scopeId: string): Record<string, unknown> {
  if (scope === TargetScope.BRANCH) return { lead: { branchId: scopeId } };
  if (scope === TargetScope.EMPLOYEE) return { userId: scopeId };
  return {};
}

export type TargetStatus = "upcoming" | "in_progress" | "completed" | "partial" | "missed";

// One row per interaction behind the calls/meetings breakdown — same
// scope/period filter as getTargetProgress's counts, so a list's total
// always matches the chip that opened it.
export async function getTargetInteractions(params: {
  prisma: PrismaClient;
  scope: TargetScope;
  scopeId: string;
  period: string;
  type: "CALL" | "MEETING";
  page?: number;
  pageSize?: number;
}) {
  const { prisma, scope, scopeId, period, type } = params;
  const { from, to } = parsePeriod(period);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

  const where = {
    ...interactionScopeFilter(scope, scopeId),
    type,
    isDeleted: false,
    createdAt: { gte: from, lte: to },
  };

  const [items, total] = await Promise.all([
    prisma.interactionLog.findMany({
      where,
      select: {
        id: true,
        note: true,
        createdAt: true,
        callDurationSecs: true,
        callDirection: true,
        callRecordingUrl: true,
        user: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.interactionLog.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getTargetProgress(params: {
  prisma: PrismaClient;
  scope: TargetScope;
  scopeId: string;
  metric: TargetMetric;
  period: string;
  value: number;
}) {
  const { prisma, scope, scopeId, metric, period, value } = params;
  const { from, to } = parsePeriod(period);
  const leadFilter = leadScopeFilter(scope, scopeId);
  const interactionFilter = interactionScopeFilter(scope, scopeId);

  // Leads/calls/meetings breakdown — shown alongside every target regardless
  // of which metric it tracks, so a manager can see the activity behind a
  // revenue or conversions number.
  const [leadsCount, callsCount, meetingsCount, conversionsCount, revenueLeads] =
    await Promise.all([
      prisma.lead.count({
        where: { ...leadFilter, createdAt: { gte: from, lte: to } },
      }),
      prisma.interactionLog.count({
        where: { ...interactionFilter, type: "CALL", isDeleted: false, createdAt: { gte: from, lte: to } },
      }),
      prisma.interactionLog.count({
        where: { ...interactionFilter, type: "MEETING", isDeleted: false, createdAt: { gte: from, lte: to } },
      }),
      // Conversions/revenue are keyed off when a deal actually closed
      // (confirmedAt), not when the lead was created — matches
      // getDashboardOverview's confirmedInPeriod semantics.
      prisma.lead.count({
        where: { ...leadFilter, status: "CLIENT", confirmedAt: { gte: from, lte: to } },
      }),
      prisma.lead.findMany({
        where: { ...leadFilter, status: "CLIENT", confirmedAt: { gte: from, lte: to } },
        select: { clientDeal: { select: { dealValue: true } } },
      }),
    ]);

  const revenue = revenueLeads.reduce((sum, l) => sum + Number(l.clientDeal?.dealValue ?? 0), 0);

  const achieved =
    metric === TargetMetric.REVENUE ? revenue : metric === TargetMetric.CONVERSIONS ? conversionsCount : leadsCount;

  const now = new Date();
  let status: TargetStatus;
  if (now < from) {
    status = "upcoming";
  } else if (now <= to) {
    status = "in_progress";
  } else if (achieved >= value) {
    status = "completed";
  } else if (achieved > 0) {
    status = "partial";
  } else {
    status = "missed";
  }

  const percent = value > 0 ? Math.round((achieved / value) * 100) : 0;

  return {
    achieved,
    target: value,
    percent,
    status,
    breakdown: {
      leads: leadsCount,
      calls: callsCount,
      meetings: meetingsCount,
      conversions: conversionsCount,
      revenue,
    },
  };
}
