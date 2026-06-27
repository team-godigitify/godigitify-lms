import { PrismaClient } from "../src/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Create the branch
  const branch = await prisma.branch.upsert({
    where: { id: "branch-banur" },
    update: {},
    create: {
      id: "branch-banur",
      name: "Godigitify - Banur",
      city: "Banur, Punjab",
      address: "Banur, Punjab, India",
    },
  });

  // 2. Seed admin and test users
  const adminPasswordHash = await bcrypt.hash("Admin@Godigitify123", 12);

  await prisma.user.upsert({
    where: { email: "admin@godigitify.com" },
    update: { passwordHash: adminPasswordHash },
    create: {
      name: "Admin",
      email: "admin@godigitify.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      branchId: branch.id,
    },
  });

  const subAdminPasswordHash = await bcrypt.hash("SubAdmin@Godigitify123", 12);

  await prisma.user.upsert({
    where: { email: "subadmin@godigitify.com" },
    update: { passwordHash: subAdminPasswordHash },
    create: {
      name: "Sub Admin",
      email: "subadmin@godigitify.com",
      passwordHash: subAdminPasswordHash,
      role: "SUB_ADMIN",
      branchId: branch.id,
    },
  });

  // 3. Seed lead source types (digital agency sources)
  const sources = [
    "Manual Entry",
    "CSV Import",
    "Meta Lead Ads",
    "Website Enquiry",
    "WhatsApp",
    "Cold Outreach",
    "Referral",
    "Others",
  ];

  for (const name of sources) {
    await prisma.leadSourceType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Seed complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
