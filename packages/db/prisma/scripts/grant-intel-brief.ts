/**
 * Grant (or revoke) Intel Brief generation access for a user.
 *
 *   pnpm --filter @lms/db intel-brief:grant  <email>
 *   pnpm --filter @lms/db intel-brief:grant  <email> --revoke
 *
 * Prints the matched user and the before/after value. Exits non-zero if no
 * user matches, so a typo'd email fails loudly instead of silently doing
 * nothing.
 */
import { PrismaClient } from "../../src/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const email = args.find((a) => !a.startsWith("--"))?.toLowerCase().trim();

  if (!email) {
    console.error(
      "Usage: tsx prisma/scripts/grant-intel-brief.ts <email> [--revoke]",
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      canGenerateIntelBrief: true,
    },
  });

  if (!user) {
    console.error(`No user found with email ${email}`);
    // Surface near-misses so a wrong domain is easy to spot.
    const local = email.split("@")[0] ?? email;
    const similar = await prisma.user.findMany({
      where: { email: { startsWith: local, mode: "insensitive" } },
      select: { name: true, email: true },
    });
    if (similar.length) {
      console.error("Did you mean:");
      for (const s of similar) console.error(`  ${s.name} <${s.email}>`);
    }
    process.exit(1);
  }

  console.log(`Found: ${user.name} <${user.email}> — ${user.role}`);
  if (!user.isActive) console.log("Note: this account is currently INACTIVE.");

  const next = !revoke;
  if (user.canGenerateIntelBrief === next) {
    console.log(
      `Already ${next ? "granted" : "revoked"} — nothing to change.`,
    );
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { canGenerateIntelBrief: next },
  });

  console.log(
    `canGenerateIntelBrief: ${user.canGenerateIntelBrief} → ${next}`,
  );
  if (user.role !== "EMPLOYEE") {
    console.log(
      `Note: ${user.role} could already generate Intel Briefs by role — this flag only matters for EMPLOYEE.`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
    void pool.end();
  });
