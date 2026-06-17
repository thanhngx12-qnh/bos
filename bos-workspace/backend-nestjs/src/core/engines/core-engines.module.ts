// File: src/core/engines/core-engines.module.ts
import { Global, Module } from '@nestjs/common';
import { ConditionEvaluatorService } from './condition-evaluator.service';

@Global()
@Module({
  providers: [ConditionEvaluatorService],
  exports: [ConditionEvaluatorService], // Đóng gói để dùng chung cho Workflows, Automation, Records
})
export class CoreEnginesModule {}
