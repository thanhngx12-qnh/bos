// File: src/app.module.ts
import {
  Module,
  ValidationPipe,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
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
import { NotificationsModule } from './modules/notifications/notifications.module'; // <-- IMPORT MỚI

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
    NotificationsModule, // <-- KÍCH HOẠT MODULE THÔNG BÁO
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
