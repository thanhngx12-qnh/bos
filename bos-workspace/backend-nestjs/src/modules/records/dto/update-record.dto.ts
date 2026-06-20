// File: src/modules/records/dto/update-record.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateRecordDto {
  @ApiPropertyOptional({ description: 'Tiêu đề hồ sơ mới' })
  @IsString()
  @IsOptional()
  title?: string;
  @ApiPropertyOptional({
    description: 'Dữ liệu cập nhật dạng JSON',
    example: {
      reason: 'Mua Macbook Pro M3 Max cấu hình cao',
      total_amount: 50000000,
    },
  })
  @IsObject({ message: 'Dữ liệu cập nhật phải là một Object' })
  @IsOptional()
  data?: Record<string, any>;
}
