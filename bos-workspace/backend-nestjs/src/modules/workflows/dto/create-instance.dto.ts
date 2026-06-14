// File: src/modules/workflows/dto/create-instance.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

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
}
