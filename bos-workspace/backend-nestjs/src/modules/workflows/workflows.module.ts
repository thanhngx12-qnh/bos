import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WebhookProcessor } from './processors/webhook.processor';
import { OutboxModule } from '../outbox/outbox.module';
import { RedisModule } from '../redis/redis.module';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'webhook-queue',
    }),
    OutboxModule,
    RedisModule,
    MailerModule,
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WebhookProcessor],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
