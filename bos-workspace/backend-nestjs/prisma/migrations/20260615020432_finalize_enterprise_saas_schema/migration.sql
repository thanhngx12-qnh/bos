-- DropIndex
DROP INDEX "records_entity_id_idx";

-- AlterTable
ALTER TABLE "workflow_instances" ADD COLUMN     "tenant_id" INTEGER;

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "secret_key" TEXT,
    "events" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "records_tenant_id_entity_id_idx" ON "records"("tenant_id", "entity_id");

-- CreateIndex
CREATE INDEX "workflow_instances_record_id_status_idx" ON "workflow_instances"("record_id", "status");

-- CreateIndex
CREATE INDEX "workflow_instances_tenant_id_status_idx" ON "workflow_instances"("tenant_id", "status");

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
