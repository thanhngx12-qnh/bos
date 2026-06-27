import { Module } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { AutomationProcessor } from './automation.processor';
import { BullModule } from '@nestjs/bullmq';
import { RecordsModule } from '../records/records.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [
    // Import các hàng đợi để ném Job vào
    BullModule.registerQueue({ name: 'email-queue' }),
    BullModule.registerQueue({ name: 'webhook-queue' }),
    BullModule.registerQueue({ name: 'automation-queue' }),
    RecordsModule,
    WorkflowsModule,
  ],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationProcessor],
})
export class AutomationModule {}
