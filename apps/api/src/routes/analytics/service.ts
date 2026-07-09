import type { PrismaClient } from "@lms/db";
import type { Period } from "./helpers";
import { getDateRange } from "./helpers";

// ═══════════════════════════════════════
// DASHBOARD OVERVIEW
// All queries run in parallel — never sequential
// ═══════════════════════════════════════

export async function getDashboardOverview(params: {
  prisma: PrismaClient;
  period: Period;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
}) {
  const { prisma, branchId } = params;
  const { from, to } = getDateRange(
    params.period,
    params.dateFrom,
    params.dateTo,
  );

  const branchFilter = branchId ? { branchId } : {};
  const dateFilter = { createdAt: { gte: from, lte: to } };

  const [
    totalLeadsInPeriod,
    confirmedInPeriod,
    lostInPeriod,
    unassignedCount,
    overdueCount,
    newToday,
    totalActiveLeads,
    interestedCount,
    statusBreakdown,
    pipelineValueAgg,
  ] = await Promise.all([
    // Total leads created in period
    prisma.lead.count({
      where: { ...branchFilter, ...dateFilter },
    }),

    // Confirmed in period
    prisma.lead.count({
      where: {
        ...branchFilter,
        status: "CLIENT",
        confirmedAt: { gte: from, lte: to },
      },
    }),

    // Lost in period
    prisma.lead.count({
      where: {
        ...branchFilter,
        status: "LOST",
        updatedAt: { gte: from, lte: to },
      },
    }),

    // Currently unassigned (not terminal status)
    prisma.lead.count({
      where: {
        ...branchFilter,
        assignedToId: null,
        status: { notIn: ["CLIENT", "DUPLICATE", "LOST"] },
      },
    }),

    // Overdue follow-ups right now
    prisma.lead.count({
      where: {
        ...branchFilter,
        nextFollowUpAt: { lte: new Date() },
        status: { notIn: ["CLIENT", "DUPLICATE", "LOST"] },
      },
    }),

    // New leads today specifically
    prisma.lead.count({
      where: {
        ...branchFilter,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),

    // Total active leads (not terminal)
    prisma.lead.count({
      where: {
        ...branchFilter,
        status: { notIn: ["CLIENT", "DUPLICATE", "LOST"] },
      },
    }),

    // Interested leads right now
    prisma.lead.count({
      where: { ...branchFilter, status: "INTERESTED" },
    }),

    // Count per status for pipeline view
    prisma.lead.groupBy({
      by: ["status"],
      where: branchFilter,
      _count: { _all: true },
    }),

    // Sum of estimated deal size across all currently-open leads
    prisma.lead.aggregate({
      where: { ...branchFilter, status: { notIn: ["CLIENT", "DUPLICATE", "LOST"] } },
      _sum: { dealSizeEstimate: true },
    }),
  ]);

  // Conversion rate for the period
  const conversionRate =
    totalLeadsInPeriod > 0
      ? Math.round((confirmedInPeriod / totalLeadsInPeriod) * 100 * 10) / 10
      : 0;

  return {
    summary: {
      totalLeadsInPeriod,
      confirmedInPeriod,
      lostInPeriod,
      unassignedCount,
      overdueCount,
      newToday,
      totalActiveLeads,
      interestedCount,
      conversionRate,
      pipelineValue: Number(pipelineValueAgg._sum.dealSizeEstimate ?? 0),
    },
    pipeline: statusBreakdown.map((s) => ({
      status: s.status,
      count: s._count._all,
    })),
  };
}

// ═══════════════════════════════════════
// EMPLOYEE CALL LOG
// Individual CALL interactions behind an employee's callCount metric —
// same userId/period/isDeleted/type filter as getEmployeePerformance's
// callCount so the list total always matches the stat card.
// ═══════════════════════════════════════

export async function getEmployeeCallLog(params: {
  prisma: PrismaClient;
  employeeId: string;
  period: Period;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const { prisma, employeeId } = params;
  const { from, to } = getDateRange(params.period, params.dateFrom, params.dateTo);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

  const where = {
    userId: employeeId,
    type: "CALL" as const,
    isDeleted: false,
    createdAt: { gte: from, lte: to },
  };

  const [calls, total] = await Promise.all([
    prisma.interactionLog.findMany({
      where,
      select: {
        id: true,
        note: true,
        callDurationSecs: true,
        callDirection: true,
        callRecordingUrl: true,
        createdAt: true,
        lead: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.interactionLog.count({ where }),
  ]);

  return { calls, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ═══════════════════════════════════════
// EMPLOYEE LEADS INTERACTED
// One row per unique lead behind an employee's leadsInteracted metric —
// same userId/period/isDeleted/type(!=STATUS_CHANGED) filter as
// getEmployeePerformance's leadsInteracted so the list total always
// matches the stat card (a lead touched 3 times still counts once).
// ═══════════════════════════════════════

export async function getEmployeeInteractedLeads(params: {
  prisma: PrismaClient;
  employeeId: string;
  period: Period;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const { prisma, employeeId } = params;
  const { from, to } = getDateRange(params.period, params.dateFrom, params.dateTo);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

  const interactions = await prisma.interactionLog.findMany({
    where: {
      userId: employeeId,
      type: { not: "STATUS_CHANGED" },
      isDeleted: false,
      createdAt: { gte: from, lte: to },
    },
    select: {
      leadId: true,
      type: true,
      createdAt: true,
      lead: { select: { id: true, name: true, phone: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by lead — first occurrence per leadId is the most recent
  // interaction since the query is already sorted desc.
  const byLead = new Map<
    string,
    { lead: (typeof interactions)[number]["lead"]; lastInteractionAt: Date; interactionCount: number; callCount: number }
  >();
  for (const i of interactions) {
    const existing = byLead.get(i.leadId);
    if (existing) {
      existing.interactionCount += 1;
      if (i.type === "CALL") existing.callCount += 1;
    } else {
      byLead.set(i.leadId, {
        lead: i.lead,
        lastInteractionAt: i.createdAt,
        interactionCount: 1,
        callCount: i.type === "CALL" ? 1 : 0,
      });
    }
  }

  const leads = Array.from(byLead.values()).sort(
    (a, b) => b.lastInteractionAt.getTime() - a.lastInteractionAt.getTime(),
  );
  const total = leads.length;
  const start = (page - 1) * pageSize;
  const pageLeads = leads.slice(start, start + pageSize);

  return { leads: pageLeads, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ═══════════════════════════════════════
// EMPLOYEE PERFORMANCE
// Confirmation rate + response time + follow-up compliance
// ═══════════════════════════════════════

export async function getEmployeePerformance(params: {
  prisma: PrismaClient;
  period: Period;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  employeeId?: string;
}) {
  const { prisma, branchId } = params;
  const { from, to } = getDateRange(
    params.period,
    params.dateFrom,
    params.dateTo,
  );

  const branchFilter = branchId ? { branchId } : {};

  // Fetch employees — optionally scoped to a single employee
  const employees = await prisma.user.findMany({
    where: {
      ...branchFilter,
      role: "EMPLOYEE",
      isActive: true,
      ...(params.employeeId ? { id: params.employeeId } : {}),
    },
    select: { id: true, name: true, email: true },
  });

  // Fetch all lead data in bulk — one query, process in JS
  // This avoids N+1 (one query per employee)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const employeeIds = employees.map((e) => e.id);

  const [allLeads, allInteractions, overdueLeads, allEmployeeInteractions, last7DayInteractions] =
    await Promise.all([
      prisma.lead.findMany({
        where: {
          ...branchFilter,
          assignedToId: { in: employeeIds },
          createdAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          assignedToId: true,
          status: true,
          confirmedAt: true,
          createdAt: true,
          nextFollowUpAt: true,
          clientDeal: { select: { dealValue: true } },
        },
      }),

      // First interaction per lead — for response time calculation
      prisma.interactionLog.findMany({
        where: {
          lead: {
            assignedToId: { in: employeeIds },
            createdAt: { gte: from, lte: to },
          },
          type: { not: "STATUS_CHANGED" },
          isDeleted: false,
        },
        select: { id: true, leadId: true, userId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),

      // Leads with overdue follow-ups per employee
      prisma.lead.findMany({
        where: {
          ...branchFilter,
          assignedToId: { in: employeeIds },
          nextFollowUpAt: { lte: new Date() },
          status: { notIn: ["CLIENT", "DUPLICATE", "LOST"] },
        },
        select: { assignedToId: true },
      }),

      // All interactions BY employee during period — for call/engagement stats
      prisma.interactionLog.findMany({
        where: {
          userId: { in: employeeIds },
          createdAt: { gte: from, lte: to },
          isDeleted: false,
          type: { not: "STATUS_CHANGED" },
        },
        select: {
          userId: true,
          leadId: true,
          type: true,
          callDurationSecs: true,
          createdAt: true,
        },
      }),

      // Last 7 days interactions for daily activity chart (always fixed window)
      prisma.interactionLog.findMany({
        where: {
          userId: { in: employeeIds },
          createdAt: { gte: sevenDaysAgo },
          isDeleted: false,
          type: { not: "STATUS_CHANGED" },
        },
        select: {
          userId: true,
          leadId: true,
          type: true,
          callDurationSecs: true,
          createdAt: true,
        },
      }),
    ]);

  // Process in JS — group by employee
  const metrics = employees.map((employee) => {
    const employeeLeads = allLeads.filter(
      (l) => l.assignedToId === employee.id,
    );
    const totalAssigned = employeeLeads.length;
    const confirmed = employeeLeads.filter(
      (l) => l.status === "CLIENT",
    ).length;
    const lost = employeeLeads.filter((l) => l.status === "LOST").length;
    const revenueClosed = employeeLeads
      .filter((l) => l.status === "CLIENT")
      .reduce((sum, l) => sum + Number(l.clientDeal?.dealValue ?? 0), 0);
    const active = employeeLeads.filter(
      (l) => !["CLIENT", "LOST", "DUPLICATE"].includes(l.status),
    ).length;

    const confirmationRate =
      totalAssigned > 0
        ? Math.round((confirmed / totalAssigned) * 100 * 10) / 10
        : 0;

    // Response time: avg hours from lead creation to first interaction
    const responseTimes: number[] = [];
    for (const lead of employeeLeads) {
      const firstInteraction = allInteractions.find(
        (i) => i.leadId === lead.id && i.userId === employee.id,
      );
      if (firstInteraction) {
        const diffHours =
          (firstInteraction.createdAt.getTime() - lead.createdAt.getTime()) /
          (1000 * 60 * 60);
        responseTimes.push(diffHours);
      }
    }

    const avgResponseHours =
      responseTimes.length > 0
        ? Math.round(
            (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) *
              10,
          ) / 10
        : null;

    // Follow-up compliance
    const employeeOverdue = overdueLeads.filter(
      (l) => l.assignedToId === employee.id,
    ).length;

    const followUpComplianceRate =
      totalAssigned > 0
        ? Math.round(
            ((totalAssigned - employeeOverdue) / totalAssigned) * 100 * 10,
          ) / 10
        : 100;

    // Performance score — weighted average
    const performanceScore = Math.round(
      confirmationRate * 0.5 +
        followUpComplianceRate * 0.3 +
        (avgResponseHours !== null
          ? Math.max(0, 100 - avgResponseHours * 2) * 0.2
          : 0),
    );

    // ── Call & engagement stats (filtered by interaction date in period) ──
    const empInteractions = allEmployeeInteractions.filter(
      (i) => i.userId === employee.id,
    );
    const empCalls = empInteractions.filter((i) => i.type === "CALL");
    const callCount = empCalls.length;
    const callMinutes = Math.round(
      empCalls.reduce((sum, i) => sum + (i.callDurationSecs ?? 0), 0) / 60,
    );
    const leadsInteracted = new Set(empInteractions.map((i) => i.leadId)).size;

    // ── 7-day daily activity for sparkline chart ──
    const empDailyLogs = last7DayInteractions.filter(
      (i) => i.userId === employee.id,
    );
    const dailyActivity = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + idx + 1);
      const dateStr = d.toISOString().split("T")[0]!;
      const dayLogs = empDailyLogs.filter(
        (i) => i.createdAt.toISOString().split("T")[0] === dateStr,
      );
      const dayCalls = dayLogs.filter((i) => i.type === "CALL");
      return {
        date: dateStr,
        interactions: dayLogs.length,
        calls: dayCalls.length,
        minutes: Math.round(
          dayCalls.reduce((sum, i) => sum + (i.callDurationSecs ?? 0), 0) / 60,
        ),
      };
    });

    return {
      employee: { id: employee.id, name: employee.name, email: employee.email },
      metrics: {
        totalAssigned,
        confirmed,
        lost,
        active,
        revenueClosed,
        confirmationRate,
        avgResponseHours,
        overdueFollowUps: employeeOverdue,
        followUpComplianceRate,
        performanceScore,
        callCount,
        callMinutes,
        leadsInteracted,
        dailyActivity,
      },
    };
  });

  // Sort by performance score descending — worst performers at bottom
  metrics.sort(
    (a, b) => b.metrics.performanceScore - a.metrics.performanceScore,
  );

  return { employees: metrics, period: { from, to } };
}

// ═══════════════════════════════════════
// PIPELINE ANALYSIS
// Status breakdown + avg days per stage
// ═══════════════════════════════════════

export async function getPipelineAnalysis(params: {
  prisma: PrismaClient;
  branchId?: string;
}) {
  const { prisma, branchId } = params;
  const branchFilter = branchId ? { branchId } : {};

  const [statusCounts, recentTransitions] = await Promise.all([
    // Current count per status
    prisma.lead.groupBy({
      by: ["status"],
      where: branchFilter,
      _count: { _all: true },
    }),

    // Recent status change interactions for avg time calculation
    prisma.interactionLog.findMany({
      where: {
        type: "STATUS_CHANGED",
        statusBefore: { not: null },
        statusAfter: { not: null },
        lead: branchFilter,
        createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      select: {
        statusBefore: true,
        statusAfter: true,
        createdAt: true,
        leadId: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Calculate avg days spent in each stage
  // Group transitions by lead → calculate time between consecutive transitions
  const leadTimelines: Record<string, Array<{ status: string; at: Date }>> = {};

  for (const t of recentTransitions) {
    if (!t.leadId || !t.statusBefore || !t.statusAfter) continue;
    if (!leadTimelines[t.leadId]) leadTimelines[t.leadId] = [];
    leadTimelines[t.leadId]!.push({ status: t.statusBefore, at: t.createdAt });
  }

  const stageTimings: Record<string, number[]> = {};

  for (const timeline of Object.values(leadTimelines)) {
    for (let i = 0; i < timeline.length - 1; i++) {
      const current = timeline[i]!;
      const next = timeline[i + 1]!;
      const daysInStage =
        (next.at.getTime() - current.at.getTime()) / (1000 * 60 * 60 * 24);
      if (!stageTimings[current.status]) stageTimings[current.status] = [];
      stageTimings[current.status]!.push(daysInStage);
    }
  }

  const avgDaysPerStage: Record<string, number> = {};
  for (const [status, times] of Object.entries(stageTimings)) {
    avgDaysPerStage[status] =
      Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10;
  }

  return {
    statusBreakdown: statusCounts.map((s) => ({
      status: s.status,
      count: s._count._all,
      avgDaysInStage: avgDaysPerStage[s.status] ?? null,
    })),
  };
}

// ═══════════════════════════════════════
// SOURCE REPORT
// Leads per source + conversion rate
// ═══════════════════════════════════════

export async function getSourceReport(params: {
  prisma: PrismaClient;
  period: Period;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
}) {
  const { prisma, branchId } = params;
  const { from, to } = getDateRange(
    params.period,
    params.dateFrom,
    params.dateTo,
  );
  const branchFilter = branchId ? { branchId } : {};

  const [allSources, leadsBySource] = await Promise.all([
    prisma.leadSourceType.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),

    prisma.lead.groupBy({
      by: ["sourceId", "status"],
      where: {
        ...branchFilter,
        createdAt: { gte: from, lte: to },
      },
      _count: { _all: true },
    }),
  ]);

  // Build source report — group by sourceId then calculate rates
  const sourceMap: Record<
    string,
    { total: number; confirmed: number; lost: number }
  > = {};

  for (const row of leadsBySource) {
    const key = row.sourceId ?? "unknown";
    if (!sourceMap[key]) sourceMap[key] = { total: 0, confirmed: 0, lost: 0 };
    sourceMap[key]!.total += row._count._all;
    if (row.status === "CLIENT")
      sourceMap[key]!.confirmed += row._count._all;
    if (row.status === "LOST") sourceMap[key]!.lost += row._count._all;
  }

  const report = allSources.map((source) => {
    const data = sourceMap[source.id] ?? { total: 0, confirmed: 0, lost: 0 };
    const conversionRate =
      data.total > 0
        ? Math.round((data.confirmed / data.total) * 100 * 10) / 10
        : 0;

    return {
      source: { id: source.id, name: source.name },
      total: data.total,
      confirmed: data.confirmed,
      lost: data.lost,
      conversionRate,
    };
  });

  // Leads with no sourceId at all were already being bucketed under
  // "unknown" above but silently dropped here — only known LeadSourceType
  // rows were ever included in the output, so a lead with no source
  // recorded just vanished from the report instead of showing up as
  // unattributed. Surface it explicitly so the numbers add up to the true
  // total instead of implying better source coverage than actually exists.
  const unknown = sourceMap["unknown"];
  if (unknown && unknown.total > 0) {
    const conversionRate =
      unknown.total > 0
        ? Math.round((unknown.confirmed / unknown.total) * 100 * 10) / 10
        : 0;
    report.push({
      source: { id: "unknown", name: "No Source Recorded" },
      total: unknown.total,
      confirmed: unknown.confirmed,
      lost: unknown.lost,
      conversionRate,
    });
  }

  // Sort by total descending
  report.sort((a, b) => b.total - a.total);

  return { sources: report, period: { from, to } };
}

// ═══════════════════════════════════════
// CAMPAIGN PERFORMANCE
// Per-campaign revenue (from ClientDeal, not the rougher dealSizeEstimate)
// vs. spend — ROI is only meaningful once a manager has entered a spend
// figure for the campaign (via /settings/campaigns); campaigns without a
// spend show revenue/conversion only, roi: null.
// ═══════════════════════════════════════

export async function getCampaignPerformance(params: {
  prisma: PrismaClient;
  branchId?: string;
}) {
  const { prisma, branchId } = params;
  const branchFilter = branchId ? { branchId } : {};

  const campaigns = await prisma.campaign.findMany({
    include: { source: { select: { id: true, name: true } } },
    orderBy: { startDate: "desc" },
  });

  const rows = await Promise.all(
    campaigns.map(async (c) => {
      const [totalLeads, confirmedLeads] = await Promise.all([
        prisma.lead.count({ where: { campaignId: c.id, ...branchFilter } }),
        prisma.lead.findMany({
          where: { campaignId: c.id, status: "CLIENT", ...branchFilter },
          select: { clientDeal: { select: { dealValue: true } } },
        }),
      ]);

      const revenue = confirmedLeads.reduce(
        (sum, l) => sum + Number(l.clientDeal?.dealValue ?? 0),
        0,
      );
      const spend = Number(c.spend ?? 0);
      const roi = spend > 0 ? Math.round(((revenue - spend) / spend) * 100 * 10) / 10 : null;
      const conversionRate =
        totalLeads > 0 ? Math.round((confirmedLeads.length / totalLeads) * 100 * 10) / 10 : 0;

      return {
        campaign: {
          id: c.id,
          name: c.name,
          isActive: c.isActive,
          spend: c.spend !== null ? spend : null,
        },
        source: c.source,
        totalLeads,
        confirmed: confirmedLeads.length,
        conversionRate,
        revenue,
        roi,
      };
    }),
  );

  return { campaigns: rows.sort((a, b) => b.revenue - a.revenue) };
}

// ═══════════════════════════════════════
// FOLLOW-UP COMPLIANCE
// Overdue + never acted + scheduled-never-updated
// ═══════════════════════════════════════

export async function getFollowUpCompliance(params: {
  prisma: PrismaClient;
  branchId?: string;
}) {
  const { prisma, branchId } = params;
  const now = new Date();
  const branchFilter = branchId ? { branchId } : {};

  const overdueLeads = await prisma.lead.findMany({
    where: {
      ...branchFilter,
      nextFollowUpAt: { lte: now },
      status: { notIn: ["CLIENT", "DUPLICATE", "LOST"] },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      nextFollowUpAt: true,
      assignedTo: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { nextFollowUpAt: "asc" },
  });

  const interactionRecency = overdueLeads.length
    ? await prisma.interactionLog.groupBy({
        by: ["leadId"],
        where: {
          isDeleted: false,
          leadId: { in: overdueLeads.map((lead) => lead.id) },
        },
        _max: { createdAt: true },
      })
    : [];

  const latestInteractionByLead = new Map(
    interactionRecency.map((row) => [row.leadId, row._max.createdAt]),
  );

  const scheduledNeverActed = overdueLeads.filter((lead) => {
    const nextFollowUpAt = lead.nextFollowUpAt;
    if (!nextFollowUpAt) return false;

    const latestInteraction = latestInteractionByLead.get(lead.id);
    return !latestInteraction || latestInteraction < nextFollowUpAt;
  });

  const employeeOverdueSummary = await prisma.lead.groupBy({
    by: ["assignedToId"],
    where: {
      ...branchFilter,
      nextFollowUpAt: { lte: now },
      status: { notIn: ["CLIENT", "DUPLICATE", "LOST"] },
      assignedToId: { not: null },
    },
    _count: { _all: true },
  });

  // Enrich employee summary with names
  const employeeIds = employeeOverdueSummary
    .map((e) => e.assignedToId)
    .filter(Boolean) as string[];

  const employees = await prisma.user.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, name: true },
  });

  const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e.name]));

  const employeeWise = employeeOverdueSummary.map((row) => ({
    employeeId: row.assignedToId,
    employeeName: row.assignedToId
      ? (employeeMap[row.assignedToId] ?? "Unknown")
      : "Unassigned",
    overdueCount: row._count._all,
  }));

  employeeWise.sort((a, b) => b.overdueCount - a.overdueCount);

  return {
    totalOverdue: overdueLeads.length,
    neverActedCount: scheduledNeverActed.length,
    overdueLeads,
    neverActedLeads: scheduledNeverActed,
    employeeWise,
  };
}

// ═══════════════════════════════════════
// CLIENT APPLICATIONS REPORT
// Fees collected + dues + document status
// ═══════════════════════════════════════

export async function getConfirmedReport(params: {
  prisma: PrismaClient;
  period: Period;
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
}) {
  const { prisma, branchId } = params;
  const { from, to } = getDateRange(
    params.period,
    params.dateFrom,
    params.dateTo,
  );
  const branchFilter = branchId ? { branchId } : {};

  const clientLeads = await prisma.lead.findMany({
    where: {
      ...branchFilter,
      status: "CLIENT",
      confirmedAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      confirmedAt: true,
      assignedTo: { select: { id: true, name: true } },
      clientDeal: {
        select: {
          dealValue: true,
          servicesSold: true,
          contractStartDate: true,
        },
      },
    },
    orderBy: { confirmedAt: "desc" },
  });

  const totalDealValue = clientLeads.reduce(
    (sum, l) => sum + Number(l.clientDeal?.dealValue ?? 0),
    0,
  );

  return {
    period: { from, to },
    summary: {
      totalClients: clientLeads.length,
      totalDealValue,
      avgDealValue:
        clientLeads.length > 0
          ? Math.round((totalDealValue / clientLeads.length) * 100) / 100
          : 0,
    },
    leads: clientLeads.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      confirmedAt: l.confirmedAt,
      assignedTo: l.assignedTo,
      dealValue: Number(l.clientDeal?.dealValue ?? 0),
      servicesSold: l.clientDeal?.servicesSold ?? [],
      contractStartDate: l.clientDeal?.contractStartDate ?? null,
    })),
  };
}

// ═══════════════════════════════════════
// LEADS AT RISK
// Non-terminal leads with no interaction in staleDays+ — the leads a rep
// or manager should chase before they go cold.
// ═══════════════════════════════════════

const TERMINAL_STATUSES = ["CLIENT", "LOST", "NOT_INTERESTED", "DUPLICATE"] as const;

export async function getLeadsAtRisk(params: {
  prisma: PrismaClient;
  branchId?: string;
  assignedToId?: string;
  staleDays?: number;
}) {
  const { prisma, branchId, assignedToId } = params;
  const staleDays = params.staleDays ?? 5;
  const staleBefore = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(assignedToId ? { assignedToId } : {}),
      status: { notIn: [...TERMINAL_STATUSES] },
      interactions: {
        none: { createdAt: { gte: staleBefore }, isDeleted: false },
      },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      status: true,
      leadScore: true,
      leadPriority: true,
      assignedTo: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return { staleDays, totalAtRisk: leads.length, leads };
}

// ═══════════════════════════════════════
// REVENUE FORECAST
// Weighted pipeline value: Σ dealSizeEstimate × stageWinProbability(status).
// Win probability per status is empirical — computed from how often leads
// that ever passed through that status went on to close (STATUS_CHANGED
// transitions over the last 180 days). Statuses with too little history
// fall back to a conservative default curve rather than showing 0%.
// ═══════════════════════════════════════

const DEFAULT_STAGE_PROBABILITY: Record<string, number> = {
  NEW: 0.05,
  ATTEMPTED_CONTACT: 0.08,
  CONNECTED: 0.15,
  INTERESTED: 0.25,
  FOLLOW_UP_SCHEDULED: 0.3,
  NEGOTIATING: 0.5,
  PROPOSAL_SENT: 0.75,
};

export async function getRevenueForecast(params: {
  prisma: PrismaClient;
  branchId?: string;
}) {
  const { prisma, branchId } = params;
  const branchFilter = branchId ? { branchId } : {};

  const [openLeads, transitions] = await Promise.all([
    prisma.lead.findMany({
      where: { ...branchFilter, status: { notIn: [...TERMINAL_STATUSES] } },
      select: { id: true, status: true, dealSizeEstimate: true },
    }),
    prisma.interactionLog.findMany({
      where: {
        type: "STATUS_CHANGED",
        statusBefore: { not: null },
        lead: branchFilter,
        createdAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      },
      select: { leadId: true, statusBefore: true },
    }),
  ]);

  const transitionLeadIds = [...new Set(transitions.map((t) => t.leadId))];
  const finalStatuses = await prisma.lead.findMany({
    where: { id: { in: transitionLeadIds } },
    select: { id: true, status: true },
  });
  const finalStatusByLead = new Map(finalStatuses.map((l) => [l.id, l.status]));

  const visitedByStatus = new Map<string, Set<string>>();
  for (const t of transitions) {
    if (!t.statusBefore) continue;
    if (!visitedByStatus.has(t.statusBefore)) visitedByStatus.set(t.statusBefore, new Set());
    visitedByStatus.get(t.statusBefore)!.add(t.leadId);
  }

  const winProbability = new Map<string, number>();
  for (const [status, leadIds] of visitedByStatus.entries()) {
    let won = 0;
    for (const id of leadIds) if (finalStatusByLead.get(id) === "CLIENT") won++;
    winProbability.set(status, leadIds.size > 0 ? won / leadIds.size : 0);
  }

  let pipelineValue = 0;
  let weightedForecast = 0;
  const byStage = new Map<string, { count: number; value: number; probability: number; weighted: number }>();

  for (const lead of openLeads) {
    const value = Number(lead.dealSizeEstimate ?? 0);
    const probability =
      winProbability.get(lead.status) ?? DEFAULT_STAGE_PROBABILITY[lead.status] ?? 0.1;
    const weighted = value * probability;

    pipelineValue += value;
    weightedForecast += weighted;

    const bucket = byStage.get(lead.status) ?? { count: 0, value: 0, probability, weighted: 0 };
    bucket.count += 1;
    bucket.value += value;
    bucket.weighted += weighted;
    byStage.set(lead.status, bucket);
  }

  const topOpenDeals = [...openLeads]
    .sort((a, b) => Number(b.dealSizeEstimate ?? 0) - Number(a.dealSizeEstimate ?? 0))
    .slice(0, 10)
    .map((l) => ({ id: l.id, status: l.status, dealSizeEstimate: Number(l.dealSizeEstimate ?? 0) }));

  return {
    pipelineValue,
    weightedForecast: Math.round(weightedForecast * 100) / 100,
    byStage: Array.from(byStage.entries()).map(([status, s]) => ({
      status,
      ...s,
      probability: Math.round(s.probability * 1000) / 10,
    })),
    topOpenDeals,
  };
}

// ═══════════════════════════════════════
// BRANCH COMPARISON (ADMIN only)
// Revenue, pipeline health, and follow-up compliance side by side — the
// company-wide view SubAdmin's own dashboard deliberately excludes.
// ═══════════════════════════════════════

export async function getBranchComparison(params: { prisma: PrismaClient; period: Period }) {
  const { prisma } = params;
  const { from, to } = getDateRange(params.period);

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, city: true },
  });

  const rows = await Promise.all(
    branches.map(async (branch) => {
      const [pipelineValueAgg, totalLeads, openLeads, overdueLeads, headcount] = await Promise.all([
        prisma.lead.aggregate({
          where: { branchId: branch.id, status: { notIn: [...TERMINAL_STATUSES] } },
          _sum: { dealSizeEstimate: true },
        }),
        prisma.lead.count({ where: { branchId: branch.id, createdAt: { gte: from, lte: to } } }),
        prisma.lead.count({
          where: { branchId: branch.id, status: { notIn: [...TERMINAL_STATUSES] } },
        }),
        prisma.lead.count({
          where: {
            branchId: branch.id,
            nextFollowUpAt: { lte: new Date() },
            status: { notIn: [...TERMINAL_STATUSES] },
          },
        }),
        prisma.user.count({ where: { branchId: branch.id, role: "EMPLOYEE", isActive: true } }),
      ]);

      // Revenue actually comes from ClientDeal, not the (unreliable) estimate —
      // reuse the same source getConfirmedReport uses.
      const clientDeals = await prisma.clientDeal.findMany({
        where: { lead: { branchId: branch.id, status: "CLIENT" }, createdAt: { gte: from, lte: to } },
        select: { dealValue: true },
      });
      const revenue = clientDeals.reduce((sum, d) => sum + Number(d.dealValue), 0);

      const complianceRate = openLeads > 0 ? Math.round(((openLeads - overdueLeads) / openLeads) * 100) : 100;
      // Composite health score — 40% follow-up compliance, 60% activity level
      // (open leads relative to headcount, capped) until targets exist to
      // measure attainment against.
      const healthScore = Math.round(complianceRate * 0.4 + Math.min(100, (totalLeads / Math.max(1, headcount)) * 20) * 0.6);

      return {
        branch: { id: branch.id, name: branch.name, city: branch.city },
        revenue,
        totalLeads,
        openLeads,
        overdueLeads,
        headcount,
        complianceRate,
        healthScore,
        estimatedPipelineValue: Number(pipelineValueAgg._sum.dealSizeEstimate ?? 0),
      };
    }),
  );

  return { period: { from, to }, branches: rows.sort((a, b) => b.revenue - a.revenue) };
}

// ═══════════════════════════════════════
// WORKLOAD BALANCE
// Open (non-terminal) lead count per employee vs. the branch median — lets
// a SubAdmin spot who's overloaded and who has room for more leads.
// ═══════════════════════════════════════

export async function getWorkloadBalance(params: {
  prisma: PrismaClient;
  branchId?: string;
}) {
  const { prisma, branchId } = params;

  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE", isActive: true, ...(branchId ? { branchId } : {}) },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          assignedLeads: { where: { status: { notIn: [...TERMINAL_STATUSES] } } },
        },
      },
    },
  });

  const counts = employees.map((e) => e._count.assignedLeads).sort((a, b) => a - b);
  const median =
    counts.length === 0
      ? 0
      : counts.length % 2 === 1
        ? counts[(counts.length - 1) / 2]!
        : (counts[counts.length / 2 - 1]! + counts[counts.length / 2]!) / 2;

  return {
    median,
    employees: employees
      .map((e) => ({
        employee: { id: e.id, name: e.name },
        openLeads: e._count.assignedLeads,
        vsMedian: median > 0 ? Math.round(((e._count.assignedLeads - median) / median) * 100) : 0,
      }))
      .sort((a, b) => b.openLeads - a.openLeads),
  };
}

// ═══════════════════════════════════════
// CLIENTS NEEDING ATTENTION
// Won deals (status = CLIENT) with no interaction in 14+ days — accounts
// that have gone quiet after closing.
// ═══════════════════════════════════════

export async function getClientsNeedingAttention(params: {
  prisma: PrismaClient;
  branchId?: string;
  staleDays?: number;
}) {
  const { prisma, branchId } = params;
  const staleDays = params.staleDays ?? 14;
  const staleBefore = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  const clients = await prisma.lead.findMany({
    where: {
      status: "CLIENT",
      ...(branchId ? { branchId } : {}),
      interactions: {
        none: { createdAt: { gte: staleBefore }, isDeleted: false },
      },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      confirmedAt: true,
      assignedTo: { select: { id: true, name: true } },
      clientDeal: { select: { dealValue: true } },
    },
    orderBy: { confirmedAt: "asc" },
    take: 100,
  });

  return {
    staleDays,
    total: clients.length,
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      confirmedAt: c.confirmedAt,
      assignedTo: c.assignedTo,
      dealValue: Number(c.clientDeal?.dealValue ?? 0),
    })),
  };
}
