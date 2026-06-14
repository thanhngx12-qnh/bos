// File: src/modules/records/records.module.ts
import { Module } from '@nestjs/common';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { DynamicValidationService } from './dynamic-validation.service'; // Import

@Module({
  controllers: [RecordsController],
  providers: [RecordsService, DynamicValidationService], // Thêm vào providers
})
export class RecordsModule {}
