// File: src/modules/workflow-steps/workflow-steps.module.ts
import { Module } from '@nestjs/common';
import { WorkflowStepsService } from './workflow-steps.service';
import { WorkflowStepsController } from './workflow-steps.controller';

@Module({
  controllers: [WorkflowStepsController],
  providers: [WorkflowStepsService],
})
export class WorkflowStepsModule {}
