// File: src/app.module.ts
import {
  Module,
  ValidationPipe,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core'; // <-- IMPORT APP_INTERCEPTOR
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { EntitiesModule } from './modules/entities/entities.module';
import { FieldsModule } from './modules/fields/fields.module';
import { RecordsModule } from './modules/records/records.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { WorkflowStepsModule } from './modules/workflow-steps/workflow-steps.module';
import { PrintTemplatesModule } from './modules/print-templates/print-templates.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TenantMiddleware } from './prisma/tenant.middleware';
import { RedisModule } from './modules/redis/redis.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module'; // <-- IMPORT MODULE MỚI
import { AuditLogInterceptor } from './core/interceptors/audit-log.interceptor'; // <-- IMPORT INTERCEPTOR MỚI

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    PrismaModule,
    OrganizationsModule,
    RolesModule,
    UsersModule,
    AuthModule,
    EntitiesModule,
    FieldsModule,
    RecordsModule,
    WorkflowsModule,
    WorkflowStepsModule,
    PrintTemplatesModule,
    AnalyticsModule,
    RedisModule,
    AttachmentsModule,
    NotificationsModule,
    AuditLogsModule, // <-- KÍCH HOẠT MODULE
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    // --- KÍCH HOẠT CAMERA AN NINH TOÀN CẦU (AUTOMATIC AUDIT LOGGING) ---
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
