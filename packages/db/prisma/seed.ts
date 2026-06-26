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

  const employees = [
    { name: "Employee",   email: "employee@godigitify.com",  password: "Emp1@Godigitify123" },
    { name: "Employee 2", email: "employee2@godigitify.com", password: "Emp2@Godigitify123" },
    { name: "Employee 3", email: "employee3@godigitify.com", password: "Emp3@Godigitify123" },
    { name: "Employee 4", email: "employee4@godigitify.com", password: "Emp4@Godigitify123" },
    { name: "Employee 5", email: "employee5@godigitify.com", password: "Emp5@Godigitify123" },
  ];

  for (const emp of employees) {
    const hash = await bcrypt.hash(emp.password, 12);
    await prisma.user.upsert({
      where: { email: emp.email },
      update: { passwordHash: hash },
      create: {
        name: emp.name,
        email: emp.email,
        passwordHash: hash,
        role: "EMPLOYEE",
        branchId: branch.id,
      },
    });
  }

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
