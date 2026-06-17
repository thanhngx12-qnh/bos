/*
  Warnings:

  - You are about to drop the column `due_date` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `role_id` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `tasks` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "tasks_tenant_id_user_id_status_idx";

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "due_date",
DROP COLUMN "priority",
DROP COLUMN "role_id",
DROP COLUMN "type",
DROP COLUMN "user_id",
ADD COLUMN     "actual_completion_time" TIMESTAMP(3),
ADD COLUMN     "assignee_id" INTEGER,
ADD COLUMN     "assignee_type" TEXT,
ADD COLUMN     "completion_time_seconds" INTEGER,
ADD COLUMN     "estimated_completion_time" TIMESTAMP(3),
ALTER COLUMN "assignment_strategy" DROP DEFAULT,
ALTER COLUMN "assignment_data" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "tasks_tenant_id_assignee_id_status_idx" ON "tasks"("tenant_id", "assignee_id", "status");
