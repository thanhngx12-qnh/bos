// File: src/modules/workflow-steps/dto/create-transition.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateTransitionDto {
  @ApiProperty({ description: 'Từ Bước (ID)', example: 1 })
  @IsInt()
  @IsNotEmpty()
  fromStepId: number;

  @ApiProperty({ description: 'Tới Bước (ID)', example: 2 })
  @IsInt()
  @IsNotEmpty()
  toStepId: number;

  @ApiPropertyOptional({
    description: 'Logic rẽ nhánh (VD: total_amount > 20000000)',
    example: { field: 'total_amount', operator: '>', value: 20000000 },
  })
  @IsObject()
  @IsOptional()
  conditionLogic?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Có tự động bỏ qua nếu thỏa mãn logic không?',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  autoSkip?: boolean;
}
