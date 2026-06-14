// File: src/modules/records/dto/create-record.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject } from 'class-validator';

export class CreateRecordDto {
  @ApiProperty({ description: 'ID của Entity (Biểu mẫu)', example: 1 })
  @IsInt()
  @IsNotEmpty()
  entityId: number;

  @ApiProperty({
    description: 'Dữ liệu thực tế người dùng nhập (JSON)',
    example: {
      reason: 'Mua máy chiếu',
      total_amount: 15000000,
      category: 'Thiết bị IT',
    },
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
}
