// File: src/modules/workflow-steps/dto/update-step.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateStepDto } from './create-step.dto';

// Không cho phép chuyển Bước này sang Version khác sau khi đã tạo
export class UpdateStepDto extends PartialType(
  OmitType(CreateStepDto, ['versionId'] as const),
) {}
