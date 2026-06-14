// File: src/modules/records/dto/update-record.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRecordDto } from './create-record.dto';

// Không cho phép đổi biểu mẫu (entityId) của một bản ghi đã tạo
export class UpdateRecordDto extends PartialType(
  OmitType(CreateRecordDto, ['entityId'] as const),
) {}
