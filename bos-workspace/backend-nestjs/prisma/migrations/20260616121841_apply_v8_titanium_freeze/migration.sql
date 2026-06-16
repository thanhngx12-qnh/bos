/*
  Warnings:

  - You are about to drop the column `created_at` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `entities` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `entities` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `records` table. All the data in the column will be lost.
  - You are about to drop the column `record_code` on the `records` table. All the data in the column will be lost.
  - You are about to drop the column `current_step` on the `workflow_instances` table. All the data in the column will be lost.
  - You are about to drop the `field_definitions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[tenant_id,id]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,id]` on the table `entities` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,business_code]` on the table `records` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,id]` on the table `records` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,id]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,name]` on the table `roles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,entity_id,url]` on the table `webhook_endpoints` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenant_id,name]` on the table `workflows` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenant_id` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Made the column `tenant_id` on table `entities` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `tenant_id` to the `print_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `record_revisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `business_code` to the `records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by_id` to the `records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metadata_version_id` to the `records` table without a default value. This is not possible if the table is not empty.
  - Made the column `tenant_id` on table `records` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `tenant_id` to the `roles` table without a default value. This is not possible if the table is not empty.
  - Made the column `tenant_id` on table `system_audit_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `system_audit_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenant_id` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `current_step_id` to the `workflow_instances` table without a default value. This is not possible if the table is not empty.
  - Made the column `tenant_id` on table `workflow_instances` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenant_id` on table `workflows` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_record_id_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "entities" DROP CONSTRAINT "entities_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "field_definitions" DROP CONSTRAINT "field_definitions_entity_id_fkey";

-- DropForeignKey
ALTER TABLE "print_templates" DROP CONSTRAINT "print_templates_entity_id_fkey";

-- DropForeignKey
ALTER TABLE "record_revisions" DROP CONSTRAINT "record_revisions_record_id_fkey";

-- DropForeignKey
ALTER TABLE "records" DROP CONSTRAINT "records_entity_id_fkey";

-- DropForeignKey
ALTER TABLE "records" DROP CONSTRAINT "records_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "system_audit_logs" DROP CONSTRAINT "system_audit_logs_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "system_audit_logs" DROP CONSTRAINT "system_audit_logs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_department_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_role_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "webhook_endpoints" DROP CONSTRAINT "webhook_endpoints_entity_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_instances" DROP CONSTRAINT "workflow_instances_record_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_instances" DROP CONSTRAINT "workflow_instances_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "workflows" DROP CONSTRAINT "workflows_entity_id_fkey";

-- DropForeignKey
ALTER TABLE "workflows" DROP CONSTRAINT "workflows_tenant_id_fkey";

-- DropIndex
DROP INDEX "entities_code_key";

-- DropIndex
DROP INDEX "record_revisions_record_id_idx";

-- DropIndex
DROP INDEX "records_record_code_key";

-- DropIndex
DROP INDEX "records_tenant_id_entity_id_idx";

-- DropIndex
DROP INDEX "users_email_key";

-- DropIndex
DROP INDEX "workflow_instances_record_id_status_idx";

-- DropIndex
DROP INDEX "workflow_instances_tenant_id_status_idx";

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "etag" TEXT,
ADD COLUMN     "retention_until" TIMESTAMP(3),
ADD COLUMN     "storage_class" TEXT NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "virus_scan_status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "entities" DROP COLUMN "created_at",
DROP COLUMN "updated_at",
ADD COLUMN     "color" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "display_mode" TEXT NOT NULL DEFAULT 'TITLE',
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "title_pattern" TEXT,
ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "print_templates" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "record_revisions" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "records" DROP COLUMN "created_by",
DROP COLUMN "record_code",
ADD COLUMN     "business_code" TEXT NOT NULL,
ADD COLUMN     "created_by_id" INTEGER NOT NULL,
ADD COLUMN     "current_step_id" INTEGER,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "department_id" INTEGER,
ADD COLUMN     "metadata_version_id" INTEGER NOT NULL,
ADD COLUMN     "schema_hash" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "title" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "system_audit_logs" ALTER COLUMN "tenant_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "workflow_instances" DROP COLUMN "current_step",
ADD COLUMN     "current_step_id" INTEGER NOT NULL,
ALTER COLUMN "tenant_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "workflows" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" INTEGER,
ALTER COLUMN "tenant_id" SET NOT NULL;

-- DropTable
DROP TABLE "field_definitions";

-- CreateTable
CREATE TABLE "department_closure" (
    "tenant_id" INTEGER NOT NULL,
    "ancestor_id" INTEGER NOT NULL,
    "descendant_id" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL,

    CONSTRAINT "department_closure_pkey" PRIMARY KEY ("tenant_id","ancestor_id","descendant_id")
);

-- CreateTable
CREATE TABLE "permission_policies" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "actions" JSONB NOT NULL,
    "data_scope" TEXT NOT NULL DEFAULT 'OWNED',

    CONSTRAINT "permission_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_scope_rules" (
    "id" SERIAL NOT NULL,
    "policy_id" INTEGER NOT NULL,
    "field_code" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "data_scope_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_registry" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_definitions" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schema" JSONB NOT NULL,

    CONSTRAINT "event_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_versions" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "snapshot_hash" TEXT NOT NULL,
    "fields_snapshot" JSONB NOT NULL,
    "workflow_snapshot" JSONB,
    "permissions_snapshot" JSONB,
    "relations_snapshot" JSONB,
    "resolvers_snapshot" JSONB,
    "automation_snapshot" JSONB,
    "print_template_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relation_definitions" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source_entity_id" INTEGER NOT NULL,
    "target_entity_id" INTEGER NOT NULL,
    "cardinality" TEXT NOT NULL DEFAULT 'ONE_TO_MANY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relation_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_relations" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "definition_id" INTEGER NOT NULL,
    "source_record_id" INTEGER NOT NULL,
    "target_record_id" INTEGER NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'FORWARD',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "record_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "event_key" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "correlation_id" TEXT,
    "causation_id" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "old_data" JSONB,
    "new_data" JSONB,
    "correlation_id" TEXT,
    "causation_id" TEXT,
    "request_id" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_documents" (
    "id" SERIAL NOT NULL,
    "record_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "title" TEXT,
    "keywords" TEXT,
    "content" TEXT,
    "search_data" JSONB NOT NULL,
    "vector_version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "search_vector" tsvector,

    CONSTRAINT "search_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_calendars" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "shifts" JSONB NOT NULL DEFAULT '[]',
    "holidays" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "business_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_counters" (
    "tenant_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "last_val" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sequence_counters_pkey" PRIMARY KEY ("tenant_id","code")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "step_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "role_id" INTEGER,
    "assignment_strategy" TEXT NOT NULL DEFAULT 'ROLE',
    "assignment_data" JSONB NOT NULL DEFAULT '{}',
    "type" TEXT NOT NULL DEFAULT 'APPROVAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permission_policies_tenant_id_role_id_entity_id_key" ON "permission_policies"("tenant_id", "role_id", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_registry_tenant_id_code_key" ON "field_registry"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "event_definitions_tenant_id_code_key" ON "event_definitions"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "automation_rules_tenant_id_id_key" ON "automation_rules"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_versions_tenant_id_entity_id_version_key" ON "entity_versions"("tenant_id", "entity_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "relation_definitions_tenant_id_id_key" ON "relation_definitions"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "relation_definitions_tenant_id_code_key" ON "relation_definitions"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "record_relations_tenant_id_source_record_id_idx" ON "record_relations"("tenant_id", "source_record_id");

-- CreateIndex
CREATE INDEX "record_relations_tenant_id_target_record_id_idx" ON "record_relations"("tenant_id", "target_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "record_relations_definition_id_source_record_id_target_reco_key" ON "record_relations"("definition_id", "source_record_id", "target_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_event_key_key" ON "outbox"("event_key");

-- CreateIndex
CREATE INDEX "outbox_tenant_id_status_idx" ON "outbox"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_correlation_id_idx" ON "audit_logs"("tenant_id", "correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "search_documents_record_id_key" ON "search_documents"("record_id");

-- CreateIndex
CREATE INDEX "search_documents_search_vector_idx" ON "search_documents" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "search_documents_tenant_id_idx" ON "search_documents"("tenant_id");

-- CreateIndex
CREATE INDEX "search_documents_tenant_id_entity_id_idx" ON "search_documents"("tenant_id", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_calendars_tenant_id_name_key" ON "business_calendars"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "tasks_tenant_id_user_id_status_idx" ON "tasks"("tenant_id", "user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_id_key" ON "departments"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "entities_tenant_id_id_key" ON "entities"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "record_revisions_tenant_id_record_id_idx" ON "record_revisions"("tenant_id", "record_id");

-- CreateIndex
CREATE INDEX "records_tenant_id_entity_id_status_idx" ON "records"("tenant_id", "entity_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "records_tenant_id_business_code_key" ON "records"("tenant_id", "business_code");

-- CreateIndex
CREATE UNIQUE INDEX "records_tenant_id_id_key" ON "records"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_id_key" ON "roles"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "system_audit_logs_tenant_id_resource_resource_id_idx" ON "system_audit_logs"("tenant_id", "resource", "resource_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_id_key" ON "users"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_endpoints_tenant_id_entity_id_url_key" ON "webhook_endpoints"("tenant_id", "entity_id", "url");

-- CreateIndex
CREATE INDEX "workflow_instances_tenant_id_record_id_status_idx" ON "workflow_instances"("tenant_id", "record_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_tenant_id_name_key" ON "workflows"("tenant_id", "name");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_parent_id_fkey" FOREIGN KEY ("tenant_id", "parent_id") REFERENCES "departments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_closure" ADD CONSTRAINT "department_closure_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_closure" ADD CONSTRAINT "department_closure_tenant_id_ancestor_id_fkey" FOREIGN KEY ("tenant_id", "ancestor_id") REFERENCES "departments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_closure" ADD CONSTRAINT "department_closure_tenant_id_descendant_id_fkey" FOREIGN KEY ("tenant_id", "descendant_id") REFERENCES "departments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_department_id_fkey" FOREIGN KEY ("tenant_id", "department_id") REFERENCES "departments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_role_id_fkey" FOREIGN KEY ("tenant_id", "role_id") REFERENCES "roles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_policies" ADD CONSTRAINT "permission_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_policies" ADD CONSTRAINT "permission_policies_tenant_id_role_id_fkey" FOREIGN KEY ("tenant_id", "role_id") REFERENCES "roles"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_policies" ADD CONSTRAINT "permission_policies_tenant_id_entity_id_fkey" FOREIGN KEY ("tenant_id", "entity_id") REFERENCES "entities"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_scope_rules" ADD CONSTRAINT "data_scope_rules_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "permission_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_registry" ADD CONSTRAINT "field_registry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_definitions" ADD CONSTRAINT "event_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_versions" ADD CONSTRAINT "entity_versions_tenant_id_entity_id_fkey" FOREIGN KEY ("tenant_id", "entity_id") REFERENCES "entities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_templates" ADD CONSTRAINT "print_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "print_templates" ADD CONSTRAINT "print_templates_tenant_id_entity_id_fkey" FOREIGN KEY ("tenant_id", "entity_id") REFERENCES "entities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_tenant_id_entity_id_fkey" FOREIGN KEY ("tenant_id", "entity_id") REFERENCES "entities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_metadata_version_id_fkey" FOREIGN KEY ("metadata_version_id") REFERENCES "entity_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_revisions" ADD CONSTRAINT "record_revisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_revisions" ADD CONSTRAINT "record_revisions_tenant_id_record_id_fkey" FOREIGN KEY ("tenant_id", "record_id") REFERENCES "records"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relation_definitions" ADD CONSTRAINT "relation_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relation_definitions" ADD CONSTRAINT "relation_definitions_tenant_id_source_entity_id_fkey" FOREIGN KEY ("tenant_id", "source_entity_id") REFERENCES "entities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relation_definitions" ADD CONSTRAINT "relation_definitions_tenant_id_target_entity_id_fkey" FOREIGN KEY ("tenant_id", "target_entity_id") REFERENCES "entities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_tenant_id_definition_id_fkey" FOREIGN KEY ("tenant_id", "definition_id") REFERENCES "relation_definitions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_tenant_id_source_record_id_fkey" FOREIGN KEY ("tenant_id", "source_record_id") REFERENCES "records"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_tenant_id_target_record_id_fkey" FOREIGN KEY ("tenant_id", "target_record_id") REFERENCES "records"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_tenant_id_record_id_fkey" FOREIGN KEY ("tenant_id", "record_id") REFERENCES "records"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_audit_logs" ADD CONSTRAINT "system_audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_audit_logs" ADD CONSTRAINT "system_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_calendars" ADD CONSTRAINT "business_calendars_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_counters" ADD CONSTRAINT "sequence_counters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenant_id_entity_id_fkey" FOREIGN KEY ("tenant_id", "entity_id") REFERENCES "entities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_tenant_id_record_id_fkey" FOREIGN KEY ("tenant_id", "record_id") REFERENCES "records"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_current_step_id_fkey" FOREIGN KEY ("current_step_id") REFERENCES "workflow_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenant_id_entity_id_fkey" FOREIGN KEY ("tenant_id", "entity_id") REFERENCES "entities"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial Unique Index cho Soft Delete
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_entity_code ON entities(tenant_id, code) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_workflow_name ON workflows(tenant_id, name) WHERE deleted_at IS NULL;