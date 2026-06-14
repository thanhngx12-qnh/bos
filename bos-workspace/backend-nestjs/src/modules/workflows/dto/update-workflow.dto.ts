// File: src/modules/workflows/dto/update-workflow.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateWorkflowDto } from './create-workflow.dto';

// Không cho phép đổi Entity sau khi đã tạo quy trình
export class UpdateWorkflowDto extends PartialType(
  OmitType(CreateWorkflowDto, ['entityId'] as const),
) {}
