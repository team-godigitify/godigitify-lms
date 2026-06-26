/*
  Warnings:

  - The values [APPLICATION_SENT,UNDER_VALIDATION,CONFIRMED] on the enum `LeadStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `alternatePhone` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `boardUniversity` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `district` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `fatherName` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `maritalStatus` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `passingYear` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `pcmPcbPercentage` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `percentage` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `purpose` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `qualification` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `schoolCollege` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `sector` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `sendEmail` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `sendSms` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `studentName` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `village` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappNumber` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the `AcademicRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConfirmedApplication` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Course` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntranceExamDetail` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeadCourse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeadDocument` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "IntelBriefStatus" AS ENUM ('PENDING', 'COMPLETE', 'NEEDS_REVIEW', 'FAILED');

-- AlterEnum
BEGIN;
CREATE TYPE "LeadStatus_new" AS ENUM ('NEW', 'ATTEMPTED_CONTACT', 'CONNECTED', 'INTERESTED', 'FOLLOW_UP_SCHEDULED', 'NEGOTIATING', 'PROPOSAL_SENT', 'CLIENT', 'LOST', 'NOT_INTERESTED', 'NOT_REACHABLE', 'DUPLICATE');
ALTER TABLE "public"."Lead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "status" TYPE "LeadStatus_new" USING ("status"::text::"LeadStatus_new");
ALTER TABLE "InteractionLog" ALTER COLUMN "statusBefore" TYPE "LeadStatus_new" USING ("statusBefore"::text::"LeadStatus_new");
ALTER TABLE "InteractionLog" ALTER COLUMN "statusAfter" TYPE "LeadStatus_new" USING ("statusAfter"::text::"LeadStatus_new");
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
DROP TYPE "public"."LeadStatus_old";
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- DropForeignKey
ALTER TABLE "AcademicRecord" DROP CONSTRAINT "AcademicRecord_confirmedApplicationId_fkey";

-- DropForeignKey
ALTER TABLE "ConfirmedApplication" DROP CONSTRAINT "ConfirmedApplication_leadId_fkey";

-- DropForeignKey
ALTER TABLE "EntranceExamDetail" DROP CONSTRAINT "EntranceExamDetail_confirmedApplicationId_fkey";

-- DropForeignKey
ALTER TABLE "LeadCourse" DROP CONSTRAINT "LeadCourse_courseId_fkey";

-- DropForeignKey
ALTER TABLE "LeadCourse" DROP CONSTRAINT "LeadCourse_leadId_fkey";

-- DropForeignKey
ALTER TABLE "LeadDocument" DROP CONSTRAINT "LeadDocument_confirmedApplicationId_fkey";

-- DropForeignKey
ALTER TABLE "LeadDocument" DROP CONSTRAINT "LeadDocument_documentTypeId_fkey";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "alternatePhone",
DROP COLUMN "boardUniversity",
DROP COLUMN "dateOfBirth",
DROP COLUMN "district",
DROP COLUMN "fatherName",
DROP COLUMN "gender",
DROP COLUMN "maritalStatus",
DROP COLUMN "passingYear",
DROP COLUMN "pcmPcbPercentage",
DROP COLUMN "percentage",
DROP COLUMN "purpose",
DROP COLUMN "qualification",
DROP COLUMN "schoolCollege",
DROP COLUMN "sector",
DROP COLUMN "sendEmail",
DROP COLUMN "sendSms",
DROP COLUMN "state",
DROP COLUMN "studentName",
DROP COLUMN "village",
DROP COLUMN "whatsappNumber",
ADD COLUMN     "dealSizeEstimate" DECIMAL(65,30),
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "isProfileComplete" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leadPriority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "metaRawPayload" JSONB,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- DropTable
DROP TABLE "AcademicRecord";

-- DropTable
DROP TABLE "ConfirmedApplication";

-- DropTable
DROP TABLE "Course";

-- DropTable
DROP TABLE "DocumentType";

-- DropTable
DROP TABLE "EntranceExamDetail";

-- DropTable
DROP TABLE "LeadCourse";

-- DropTable
DROP TABLE "LeadDocument";

-- DropEnum
DROP TYPE "Gender";

-- DropEnum
DROP TYPE "MaritalStatus";

-- DropEnum
DROP TYPE "QualificationLevel";

-- CreateTable
CREATE TABLE "ClientDeal" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "dealValue" DECIMAL(65,30) NOT NULL,
    "servicesSold" TEXT[],
    "contractStartDate" TIMESTAMP(3) NOT NULL,
    "quotationLink" TEXT NOT NULL,
    "closedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelBrief" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "rawInput" JSONB NOT NULL,
    "aiOutput" JSONB NOT NULL,
    "validatedOutput" JSONB,
    "status" "IntelBriefStatus" NOT NULL DEFAULT 'PENDING',
    "aiModelUsed" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "manualOverrideBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntelBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientDeal_leadId_key" ON "ClientDeal"("leadId");

-- CreateIndex
CREATE INDEX "ClientDeal_leadId_idx" ON "ClientDeal"("leadId");

-- CreateIndex
CREATE INDEX "ClientDeal_closedById_idx" ON "ClientDeal"("closedById");

-- CreateIndex
CREATE INDEX "ClientDeal_createdAt_idx" ON "ClientDeal"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntelBrief_leadId_key" ON "IntelBrief"("leadId");

-- CreateIndex
CREATE INDEX "IntelBrief_leadId_idx" ON "IntelBrief"("leadId");

-- CreateIndex
CREATE INDEX "IntelBrief_status_idx" ON "IntelBrief"("status");

-- CreateIndex
CREATE INDEX "Lead_instagramUrl_idx" ON "Lead"("instagramUrl");

-- CreateIndex
CREATE INDEX "Lead_websiteUrl_idx" ON "Lead"("websiteUrl");

-- CreateIndex
CREATE INDEX "Lead_isProfileComplete_idx" ON "Lead"("isProfileComplete");

-- CreateIndex
CREATE INDEX "Lead_leadPriority_idx" ON "Lead"("leadPriority");

-- AddForeignKey
ALTER TABLE "ClientDeal" ADD CONSTRAINT "ClientDeal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDeal" ADD CONSTRAINT "ClientDeal_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelBrief" ADD CONSTRAINT "IntelBrief_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
