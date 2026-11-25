import type { FastifyInstance } from "fastify";
import { config } from "../config";
import { QUEUES } from "../plugins/bullmq";

// Checks every minute for follow-ups due within the next N minutes (default 15)
// and emails the alert recipients (Shreya + Aniket) once per follow-up — for
// every lead, assigned or not. Overdue follow-ups are NOT handled here; those
// still go to the assigned employee via jobs/followUp.ts.
const INTERVAL_MS = 60 * 1000;
const SENT_KEY_TTL_SECS = 2 * 24 * 60 * 60;

async function resolveRecipients(fastify: FastifyInstance): Promise<string[]> {
  if (config.followUpAlertEmails.length > 0) return [...config.followUpAlertEmails];
  if (config.followUpAlertNames.length === 0) return [];

  const users = await fastify.prisma.user.findMany({
    where: {
      isActive: true,
      OR: config.followUpAlertNames.map((name) => ({
        name: { contains: name, mode: "insensitive" as const },
      })),
    },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

export function startUpcomingFollowUpAlertCron(fastify: FastifyInstance): void {
  const leadMs = config.followUpAlertLeadMinutes * 60 * 1000;
  fastify.log.info(
    `Upcoming follow-up alert cron started — alerts ${config.followUpAlertLeadMinutes} min before due`,
  );

  let warnedNoRecipients = false;

  const run = async (): Promise<void> => {
    try {
      const now = new Date();
      const leads = await fastify.prisma.lead.findMany({
        where: {
          nextFollowUpAt: { gt: now, lte: new Date(now.getTime() + leadMs) },
          status: { notIn: ["CLIENT", "DUPLICATE", "LOST"] },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
          nextFollowUpAt: true,
          assignedTo: { select: { name: true } },
        },
      });
      if (leads.length === 0) return;

      const recipients = await resolveRecipients(fastify);
      if (recipients.length === 0) {
        if (!warnedNoRecipients) {
          fastify.log.warn(
            "Upcoming follow-up alert: no recipients found — set FOLLOWUP_ALERT_EMAILS",
          );
          warnedNoRecipients = true;
        }
        return;
      }
      warnedNoRecipients = false;

      let queued = 0;
      for (const lead of leads) {
        const dueAt = lead.nextFollowUpAt!;
        // One alert per lead per scheduled time — rescheduling triggers a new alert
        const sentKey = `followup-alert:${lead.id}:${dueAt.getTime()}`;
        const firstTime = await fastify.redis.set(sentKey, "1", "EX", SENT_KEY_TTL_SECS, "NX");
        if (firstTime !== "OK") continue;

        for (const to of recipients) {
          await fastify.queues[QUEUES.NOTIFICATIONS].add(
            "upcoming-followup-alert",
            {
              to,
              leadId: lead.id,
              leadName: lead.name ?? null,
              phone: lead.phone,
              status: lead.status,
              assignedToName: lead.assignedTo?.name ?? null,
              dueAt: dueAt.toISOString(),
            },
            {
              attempts: 3,
              backoff: { type: "exponential", delay: 10_000 },
              removeOnComplete: true,
            },
          );
        }
        queued++;
      }

      if (queued > 0) {
        fastify.log.info(
          `Upcoming follow-up alert: ${queued} lead(s) → ${recipients.length} recipient(s)`,
        );
      }
    } catch (error) {
      fastify.log.error({ error }, "Upcoming follow-up alert cron failed");
    }
  };

  void run();
  setInterval(() => void run(), INTERVAL_MS);
}
