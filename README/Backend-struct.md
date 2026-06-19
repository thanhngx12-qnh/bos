mac@Thanh-Xuans-Macbook backend-nestjs % tree -I 'dist|node_modules'
.
├── README.md
├── Tự
├── chung_tu_test.txt
├── eslint.config.mjs
├── nest-cli.json
├── openapi-spec.json
├── package-lock.json
├── package.json
├── prisma
│ ├── migrations
│ │ ├── 20260614121111_init_bos_core_schema
│ │ │ └── migration.sql
│ │ ├── 20260614123005_add_user_password
│ │ │ └── migration.sql
│ │ ├── 20260614130208_enterprise_schema_upgrade
│ │ │ └── migration.sql
│ │ ├── 20260614153304_schema_saas_upgrade
│ │ │ └── migration.sql
│ │ ├── 20260614155953_add_multi_tenancy
│ │ │ └── migration.sql
│ │ ├── 20260614161517_add_record_revisions
│ │ │ └── migration.sql
│ │ ├── 20260614164653_add_secure_attachments
│ │ │ └── migration.sql
│ │ ├── 20260615013253_add_notifications
│ │ │ └── migration.sql
│ │ ├── 20260615020432_finalize_enterprise_saas_schema
│ │ │ └── migration.sql
│ │ ├── 20260615042216_add_system_audit_logs
│ │ │ └── migration.sql
│ │ ├── 20260616121841_apply_v8_titanium_freeze
│ │ │ └── migration.sql
│ │ ├── 20260617155743_add_kpi_task_engine_v2
│ │ │ └── migration.sql
│ │ ├── 20260618025841_allow_independent_tasks
│ │ │ └── migration.sql
│ │ └── migration_lock.toml
│ └── schema.prisma
├── prisma.config.ts
├── src
│ ├── app.controller.spec.ts
│ ├── app.module.ts
│ ├── app.service.ts
│ ├── core
│ │ ├── engines
│ │ │ ├── condition-evaluator.service.ts
│ │ │ ├── core-engines.module.ts
│ │ │ └── reference-resolver.service.ts
│ │ ├── guards
│ │ │ ├── jwt-auth.guard.ts
│ │ │ └── super-admin.guard.ts
│ │ ├── interceptors
│ │ │ └── audit-log.interceptor.ts
│ │ ├── interfaces
│ │ │ └── domain-event.interface.ts
│ │ └── strategies
│ │ └── jwt.strategy.ts
│ ├── main.ts
│ ├── modules
│ │ ├── analytics
│ │ │ ├── analytics.controller.ts
│ │ │ ├── analytics.module.ts
│ │ │ └── analytics.service.ts
│ │ ├── attachments
│ │ │ ├── attachments.controller.ts
│ │ │ ├── attachments.module.ts
│ │ │ ├── attachments.service.ts
│ │ │ └── dto
│ │ │ └── upload-attachment.dto.ts
│ │ ├── audit-logs
│ │ │ ├── audit-logs.controller.ts
│ │ │ ├── audit-logs.module.ts
│ │ │ ├── audit-logs.service.ts
│ │ │ └── dto
│ │ ├── auth
│ │ │ ├── auth.controller.ts
│ │ │ ├── auth.module.ts
│ │ │ ├── auth.service.ts
│ │ │ └── dto
│ │ │ ├── login.dto.ts
│ │ │ └── register-tenant.dto.ts
│ │ ├── automation
│ │ │ ├── automation.module.ts
│ │ │ └── automation.service.ts
│ │ ├── entities
│ │ │ ├── dto
│ │ │ │ ├── create-entity.dto.ts
│ │ │ │ └── update-entity.dto.ts
│ │ │ ├── entities.controller.ts
│ │ │ ├── entities.module.ts
│ │ │ └── entities.service.ts
│ │ ├── events
│ │ │ ├── events.module.ts
│ │ │ └── events.service.ts
│ │ ├── fields
│ │ │ ├── dto
│ │ │ │ ├── create-field.dto.ts
│ │ │ │ └── update-field.dto.ts
│ │ │ ├── fields.controller.ts
│ │ │ ├── fields.module.ts
│ │ │ ├── fields.service.ts
│ │ │ └── interfaces
│ │ │ └── field-options.interface.ts
│ │ ├── mailer
│ │ │ ├── mailer.controller.ts
│ │ │ ├── mailer.module.ts
│ │ │ ├── mailer.service.ts
│ │ │ ├── processors
│ │ │ │ └── email.processor.ts
│ │ │ └── templates
│ │ │ └── new-approval-request.hbs
│ │ ├── notifications
│ │ │ ├── notifications.controller.ts
│ │ │ ├── notifications.module.ts
│ │ │ └── notifications.service.ts
│ │ ├── organizations
│ │ │ ├── departments.controller.ts
│ │ │ ├── departments.service.ts
│ │ │ ├── dto
│ │ │ │ ├── create-department.dto.ts
│ │ │ │ └── update-department.dto.ts
│ │ │ └── organizations.module.ts
│ │ ├── outbox
│ │ │ ├── outbox.module.ts
│ │ │ ├── outbox.processor.ts
│ │ │ └── outbox.service.ts
│ │ ├── print-templates
│ │ │ ├── dto
│ │ │ │ ├── create-template.dto.ts
│ │ │ │ └── update-template.dto.ts
│ │ │ ├── print-templates.controller.ts
│ │ │ ├── print-templates.module.ts
│ │ │ └── print-templates.service.ts
│ │ ├── records
│ │ │ ├── dto
│ │ │ │ ├── create-record.dto.ts
│ │ │ │ └── update-record.dto.ts
│ │ │ ├── dynamic-validation.service.ts
│ │ │ ├── formula-engine.service.ts
│ │ │ ├── formula-parser.util.ts
│ │ │ ├── records.controller.ts
│ │ │ ├── records.module.ts
│ │ │ └── records.service.ts
│ │ ├── redis
│ │ │ ├── redis.module.ts
│ │ │ └── redis.service.ts
│ │ ├── roles
│ │ │ ├── dto
│ │ │ │ ├── create-role.dto.ts
│ │ │ │ └── update-role.dto.ts
│ │ │ ├── roles.controller.ts
│ │ │ ├── roles.module.ts
│ │ │ └── roles.service.ts
│ │ ├── search
│ │ │ ├── listeners
│ │ │ │ └── record-search.listener.ts
│ │ │ ├── search.module.ts
│ │ │ └── search.service.ts
│ │ ├── tasks
│ │ │ ├── dto
│ │ │ │ ├── complete-task.dto.ts
│ │ │ │ └── task-action.dto.ts
│ │ │ ├── tasks.controller.ts
│ │ │ ├── tasks.module.ts
│ │ │ ├── tasks.scheduler.ts
│ │ │ └── tasks.service.ts
│ │ ├── tenants
│ │ │ ├── dto
│ │ │ │ ├── create-tenant.dto.ts
│ │ │ │ └── update-tenant.dto.ts
│ │ │ ├── tenants.controller.ts
│ │ │ ├── tenants.module.ts
│ │ │ └── tenants.service.ts
│ │ ├── users
│ │ │ ├── dto
│ │ │ │ ├── create-user.dto.ts
│ │ │ │ └── update-user.dto.ts
│ │ │ ├── users.controller.ts
│ │ │ ├── users.module.ts
│ │ │ └── users.service.ts
│ │ ├── workflow-steps
│ │ │ ├── dto
│ │ │ │ ├── create-step.dto.ts
│ │ │ │ ├── create-transition.dto.ts
│ │ │ │ ├── update-step.dto.ts
│ │ │ │ └── update-transition.dto.ts
│ │ │ ├── workflow-steps.controller.ts
│ │ │ ├── workflow-steps.module.ts
│ │ │ └── workflow-steps.service.ts
│ │ └── workflows
│ │ ├── dto
│ │ │ ├── create-instance.dto.ts
│ │ │ ├── create-workflow.dto.ts
│ │ │ ├── update-workflow.dto.ts
│ │ │ └── workflow-action.dto.ts
│ │ ├── processors
│ │ │ └── webhook.processor.ts
│ │ ├── workflows.controller.ts
│ │ ├── workflows.module.ts
│ │ └── workflows.service.ts
│ └── prisma
│ ├── prisma.helper.ts
│ ├── prisma.module.ts
│ ├── prisma.service.ts
│ ├── tenant-context.ts
│ └── tenant.middleware.ts
├── test
│ ├── app.e2e-spec.ts
│ └── jest-e2e.json
├── tsconfig.build.json
└── tsconfig.json

67 directories, 145 files
