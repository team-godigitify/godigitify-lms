-- AlterTable
ALTER TABLE "ConfirmedApplication" ADD COLUMN "fatherName" TEXT;
ALTER TABLE "ConfirmedApplication" ADD COLUMN "fileNumber" TEXT;
ALTER TABLE "ConfirmedApplication" ADD COLUMN "admissionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ConfirmedApplication_fileNumber_key" ON "ConfirmedApplication"("fileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ConfirmedApplication_admissionId_key" ON "ConfirmedApplication"("admissionId");
