// File: src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { tenantContext } from './tenant-context'; // Import Context

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
            // Sửa mảng này trong src/prisma/prisma.service.ts
            const tenantModels = [
              'User',
              'Entity',
              'Record',
              'Workflow',
              'Attachment',
            ]; // <-- THÊM 'Attachment' VÀO ĐÂY

            if (tenantModels.includes(model)) {
              const store = tenantContext.getStore();

              if (store && store.tenantId) {
                const customArgs = args as any;

                // CHỈ CHÈN `where` CHO CÁC HÀM THỰC SỰ HỖ TRỢ ĐIỀU KIỆN LỌC (Tránh lỗi 'Unknown argument where' khi create)
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

                  // Tự động gán bộ lọc where tenantId toàn cục
                  if (customArgs.where.tenantId === undefined) {
                    customArgs.where.tenantId = store.tenantId;
                  }
                }

                // Tự động gán trường tenantId vào dữ liệu (data) khi tạo mới (create)
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

    // Trả về thực thể Prisma đã được mở rộng để giữ nguyên cách gọi api cũ
    return extended as any;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
