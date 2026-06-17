// File: src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { tenantContext } from './tenant-context';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5435/bos_core_db?schema=public';
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });

    // HACK LÕI PRISMA: Tự động cô lập dữ liệu cho tất cả các bảng
    const extended = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // SỬA LỖI TẠI ĐÂY: Đã bổ sung đầy đủ Department, DepartmentClosure, Role...
            const tenantModels = [
              'User',
              'Role',
              'Department',
              'DepartmentClosure',
              'Entity',
              'FieldRegistry',
              'PrintTemplate',
              'Record',
              'RecordRevision',
              'Attachment',
              'Workflow',
              'WorkflowInstance',
              'WebhookEndpoint',
              'Notification',
              'SystemAuditLog',
              'Task',
            ];

            if (tenantModels.includes(model)) {
              const store = tenantContext.getStore();

              if (store && store.tenantId) {
                const customArgs = args as any;

                const operationsWithWhere = [
                  'findUnique',
                  'findUniqueOrThrow',
                  'findFirst',
                  'findFirstOrThrow',
                  'findMany',
                  'update',
                  'updateMany',
                  'upsert',
                  'delete',
                  'deleteMany',
                  'count',
                  'aggregate',
                  'groupBy',
                ];

                if (operationsWithWhere.includes(operation)) {
                  customArgs.where = customArgs.where || {};

                  if (customArgs.where.tenantId === undefined) {
                    customArgs.where.tenantId = store.tenantId;
                  }
                }

                if (
                  ['create', 'createMany'].includes(operation) &&
                  customArgs.data
                ) {
                  customArgs.data.tenantId = store.tenantId;
                }
              }
            }
            return query(args);
          },
        },
      },
    });

    return extended as any;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
