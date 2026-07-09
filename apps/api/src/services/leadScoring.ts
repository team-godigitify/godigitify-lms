import type { PrismaClient } from "@lms/db";
import { computeLeadScore } from "@lms/core";

// Recomputes and persists Lead.leadScore. Called after anything that
// changes one of the four scoring inputs: profile completeness/priority
// (create/update), engagement recency (new interaction), or status
// (transition — a status change is itself logged as an interaction).
export async function recomputeLeadScore(
  prisma: PrismaClient,
  leadId: string,
): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      isProfileComplete: true,
      instagramUrl: true,
      websiteUrl: true,
      leadPriority: true,
      createdAt: true,
      sourceId: true,
    },
  });
  if (!lead) return;

  const [lastInteraction, sourceConversionRate] = await Promise.all([
    prisma.interactionLog.findFirst({
      where: { leadId, isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    lead.sourceId ? getSourceConversionRate(prisma, lead.sourceId) : Promise.resolve(null),
  ]);

  const leadScore = computeLeadScore({
    isProfileComplete: lead.isProfileComplete,
    instagramUrl: lead.instagramUrl,
    websiteUrl: lead.websiteUrl,
    leadPriority: lead.leadPriority,
    createdAt: lead.createdAt,
    lastInteractionAt: lastInteraction?.createdAt ?? null,
    sourceConversionRate,
  });

  await prisma.lead.update({ where: { id: leadId }, data: { leadScore } });
}

async function getSourceConversionRate(
  prisma: PrismaClient,
  sourceId: string,
): Promise<number | null> {
  const [total, confirmed] = await Promise.all([
    prisma.lead.count({ where: { sourceId } }),
    prisma.lead.count({ where: { sourceId, status: "CLIENT" } }),
  ]);
  if (total === 0) return null;
  return Math.round((confirmed / total) * 100 * 10) / 10;
}
