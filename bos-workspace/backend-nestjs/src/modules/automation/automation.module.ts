// File: src/modules/automation/automation.module.ts
import { Module } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    // Import các hàng đợi để ném Job vào
    BullModule.registerQueue({ name: 'email-queue' }),
    BullModule.registerQueue({ name: 'webhook-queue' }),
  ],
  providers: [AutomationService],
})
export class AutomationModule {}
