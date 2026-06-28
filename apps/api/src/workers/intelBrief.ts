import { Worker } from "bullmq";
import type Redis from "ioredis";
import type { PrismaClient } from "@lms/db";
import { generateIntelBrief } from "../services/intelBrief";

export type IntelBriefJobData = {
  leadId: string;
  name: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  industry: string | null;
  dealSizeEstimate: number | null;
};

export function startIntelBriefWorker(connection: Redis, prisma: PrismaClient): Worker {
  const worker = new Worker<IntelBriefJobData>(
    "intel-brief",
    async (job) => {
      const { leadId, name, instagramUrl, websiteUrl, industry, dealSizeEstimate } = job.data;
      console.log(`[INTEL BRIEF] Processing lead ${leadId}`);

      // Upsert brief record in PENDING state if it doesn't exist
      const brief = await prisma.intelBrief.upsert({
        where: { leadId },
        create: {
          leadId,
          rawInput: { name, instagramUrl, websiteUrl, industry, dealSizeEstimate },
          aiOutput: {},
          status: "PENDING",
          aiModelUsed: "",
        },
        update: {
          status: "PENDING",
          rawInput: { name, instagramUrl, websiteUrl, industry, dealSizeEstimate },
        },
      });

      try {
        const { output, modelUsed } = await generateIntelBrief({
          name,
          instagramUrl,
          websiteUrl,
          industry,
          dealSizeEstimate,
        });

        await prisma.intelBrief.update({
          where: { id: brief.id },
          data: {
            aiOutput: output as object,
            validatedOutput: output as object,
            status: "COMPLETE",
            aiModelUsed: modelUsed,
          },
        });

        console.log(`[INTEL BRIEF] Completed for lead ${leadId}`);
      } catch (err) {
        const retryCount = (brief.retryCount ?? 0) + 1;
        const newStatus = retryCount >= 3 ? "FAILED" : "NEEDS_REVIEW";

        await prisma.intelBrief.update({
          where: { id: brief.id },
          data: {
            status: newStatus,
            retryCount,
            aiOutput: { error: err instanceof Error ? err.message : String(err) },
          },
        });

        console.error(`[INTEL BRIEF] Failed for lead ${leadId} (attempt ${retryCount}):`, err);

        // Only retry if under limit
        if (retryCount < 3) throw err;
      }
    },
    {
      connection,
      // Keep this serial to avoid multiple expensive AI runs piling up at once.
      concurrency: 1,
      // Exponential backoff: 30s, 2min, 8min
      limiter: { max: 10, duration: 60_000 },
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`[INTEL BRIEF WORKER] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
