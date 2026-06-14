// File: src/modules/records/records.module.ts
import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { DynamicValidationService } from './dynamic-validation.service'; // Import
import { FormulaEngineService } from './formula-engine.service';

@Module({
  controllers: [RecordsController],
  providers: [RecordsService, DynamicValidationService, FormulaEngineService], // Thêm vào providers
})
export class RecordsModule {}
