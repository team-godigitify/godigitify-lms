-- Every lead created before the country picker is an Indian number stored as a
-- bare 10-digit national number, so the default backfills existing rows to +91.

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "phoneCountryCode" TEXT NOT NULL DEFAULT '+91';
