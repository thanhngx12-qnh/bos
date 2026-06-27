// File: src/modules/workflows/dto/create-instance.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateInstanceDto {
  @ApiProperty({
    description: 'ID của Bản ghi dữ liệu (Form đã submit)',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  recordId: number;

  @ApiProperty({
    description: 'ID của Workflow Version muốn áp dụng',
    example: 2,
  })
  @IsInt()
  @IsNotEmpty()
  versionId: number;

  @ApiPropertyOptional({
    description: 'ID của người duyệt tiếp theo được chỉ định động',
    example: 10,
  })
  @IsInt()
  @IsOptional()
  nextAssigneeId?: number;
}
