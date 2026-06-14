/*
  Warnings:

  - A unique constraint covering the columns `[record_code]` on the table `records` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "entities" ADD COLUMN     "auto_code_pattern" TEXT;

-- AlterTable
ALTER TABLE "records" ADD COLUMN     "record_code" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "user_type" TEXT NOT NULL DEFAULT 'INTERNAL';

-- AlterTable
ALTER TABLE "workflows" ADD COLUMN     "visibility" JSONB NOT NULL DEFAULT '{}';

-- CreateIndex
CREATE UNIQUE INDEX "records_record_code_key" ON "records"("record_code");
