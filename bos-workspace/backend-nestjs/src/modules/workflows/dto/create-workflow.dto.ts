// File: src/modules/workflows/dto/create-workflow.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  Length,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateWorkflowDto {
  @ApiProperty({
    description: 'ID của Entity (Biểu mẫu) gắn với quy trình này',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  entityId: number;

  @ApiProperty({
    description: 'Tên quy trình',
    example: 'Quy trình xét duyệt mua sắm',
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  name: string;

  @ApiPropertyOptional({ description: 'Mô tả chung' })
  @IsString()
  @IsOptional()
  description?: string;

  // THUỘC TÍNH MỚI: Khai báo để tránh bị Whitelist Pipe của NestJS gạt bỏ khi PATCH
  @ApiPropertyOptional({
    description: 'Cấu hình phân quyền tầm nhìn',
    example: { allowAll: false, allowedDepartments: [1] },
  })
  @IsObject()
  @IsOptional()
  visibility?: Record<string, any>;
}
