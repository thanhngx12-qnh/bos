// File: src/modules/workflow-steps/dto/create-step.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateStepDto {
  @ApiProperty({ description: 'ID của Workflow Version', example: 2 })
  @IsInt()
  @IsNotEmpty()
  versionId: number;

  @ApiProperty({ description: 'Tên bước', example: 'Trưởng phòng phê duyệt' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Loại bước (USER_TASK, SYSTEM_TASK)',
    default: 'USER_TASK',
  })
  @IsString()
  @IsOptional()
  stepType?: string;

  @ApiPropertyOptional({
    description: 'Quyền xem/sửa dữ liệu tại bước này (Step-level RBAC)',
    example: { total_amount: 'READ', reason: 'WRITE', note: 'HIDDEN' },
  })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Thứ tự hiển thị trên sơ đồ',
    default: 0,
  })
  @IsInt()
  @IsOptional()
  orderIndex?: number;
}
