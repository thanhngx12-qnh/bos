// File: src/app.module.ts
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
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
import { AnalyticsModule } from './modules/analytics/analytics.module'; // <-- IMPORT MỚI

@Module({
  imports: [
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
    AnalyticsModule, // <-- KÍCH HOẠT
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
