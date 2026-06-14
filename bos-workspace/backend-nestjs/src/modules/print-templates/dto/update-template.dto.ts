// File: src/modules/print-templates/dto/update-template.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTemplateDto } from './create-template.dto';

// Không cho phép đổi Entity (Biểu mẫu) của một mẫu in sau khi đã tạo
export class UpdateTemplateDto extends PartialType(
  OmitType(CreateTemplateDto, ['entityId'] as const),
) {}
