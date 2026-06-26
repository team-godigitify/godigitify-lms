-- AlterTable
ALTER TABLE "ConfirmedApplication" ADD COLUMN     "isFormComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sentToStudentAt" TIMESTAMP(3),
ADD COLUMN     "sentToStudentEmail" TEXT;
