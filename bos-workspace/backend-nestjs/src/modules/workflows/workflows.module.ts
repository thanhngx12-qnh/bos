// File: src/modules/workflows/workflows.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq'; // <-- IMPORT
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WebhookProcessor } from './processors/webhook.processor'; // <-- IMPORT WORKER

@Module({
  imports: [
    // Đăng ký hàng đợi tên là webhook-queue cho Module này sử dụng
    BullModule.registerQueue({
      name: 'webhook-queue',
    }),
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WebhookProcessor], // Đăng ký Worker vào Providers
})
export class WorkflowsModule {}
