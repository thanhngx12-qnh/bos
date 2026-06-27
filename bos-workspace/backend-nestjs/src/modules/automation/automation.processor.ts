// File: src/modules/automation/automation.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AutomationService } from './automation.service';

@Processor('automation-queue')
export class AutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(private readonly automationService: AutomationService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { eventName, event } = job.data;

    this.logger.log(
      `[Automation Worker] Bat dau xu ly automation rule cho event '${eventName}'`,
    );

    try {
      await this.automationService.processAutomationRules(eventName, event);
      this.logger.log(
        `[Automation Worker] Hoan thanh xu ly rule cho event '${eventName}'`,
      );
    } catch (error) {
      this.logger.error(
        `[Automation Worker] That bai khi xu ly rule cho event '${eventName}': ${error.message}`,
      );
      throw error;
    }
  }
}
