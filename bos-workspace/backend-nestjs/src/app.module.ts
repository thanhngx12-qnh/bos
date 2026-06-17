// File: src/app.module.ts
import {
  Module,
  ValidationPipe,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { PrometheusModule } from '@willsoto/nestjs-prometheus'; // <-- IMPORT MỚI
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
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuditLogInterceptor } from './core/interceptors/audit-log.interceptor';
import { TenantsModule } from './modules/tenants/tenants.module';
import { MailerModule } from './modules/mailer/mailer.module';
import { EventsModule } from './modules/events/events.module';
import { OutboxModule } from './modules/outbox/outbox.module';

@Module({
  imports: [
    PrometheusModule.register({
      // <-- Giữ nguyên
      defaultMetrics: {
        enabled: true,
      },
    }),
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
    AuditLogsModule,
    TenantsModule,
    MailerModule,
    EventsModule,
    OutboxModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
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
