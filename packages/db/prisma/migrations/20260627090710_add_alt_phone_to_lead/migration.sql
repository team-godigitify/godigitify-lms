-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "altPhone" TEXT;

-- CreateIndex
CREATE INDEX "Lead_altPhone_idx" ON "Lead"("altPhone");
