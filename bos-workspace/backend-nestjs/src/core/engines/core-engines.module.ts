// File: src/core/engines/core-engines.module.ts
import { Global, Module } from '@nestjs/common';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { ReferenceResolverService } from './reference-resolver.service';

@Global() // Đánh dấu Global để dùng chung toàn hệ thống
@Module({
  providers: [ConditionEvaluatorService, ReferenceResolverService], // <-- KHAI BÁO 2 BỘ NÃO
  exports: [ConditionEvaluatorService, ReferenceResolverService], // <-- XUẤT KHẨU 2 BỘ NÃO
})
export class CoreEnginesModule {}
