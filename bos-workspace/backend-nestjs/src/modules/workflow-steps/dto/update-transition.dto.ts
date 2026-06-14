// File: src/modules/workflow-steps/dto/update-transition.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTransitionDto } from './create-transition.dto';

// Không cho phép đổi điểm đầu/cuối. Nếu cấu hình sai luồng, bắt buộc xóa đi nối lại.
export class UpdateTransitionDto extends PartialType(
  OmitType(CreateTransitionDto, ['fromStepId', 'toStepId'] as const),
) {}
