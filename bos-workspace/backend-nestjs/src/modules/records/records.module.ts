// File: src/modules/records/records.module.ts
import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { DynamicValidationService } from './dynamic-validation.service'; // Import
import { FormulaEngineService } from './formula-engine.service';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [OutboxModule],
  controllers: [RecordsController],
  providers: [RecordsService, DynamicValidationService, FormulaEngineService], // Thêm vào providers
  exports: [RecordsService],
})
export class RecordsModule {}
