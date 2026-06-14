// File: src/modules/fields/dto/update-field.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateFieldDto } from './create-field.dto';

// Không cho phép sửa entityId và code sau khi đã tạo trường
export class UpdateFieldDto extends PartialType(
  OmitType(CreateFieldDto, ['entityId', 'code'] as const),
) {}
