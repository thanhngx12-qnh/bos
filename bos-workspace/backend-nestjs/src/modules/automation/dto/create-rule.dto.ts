import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class CreateRuleDto {
  @ApiProperty({ description: 'Tên quy tắc', example: 'Tự động chạy quy trình tiếp theo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'ID của sự kiện kích hoạt', example: 1 })
  @IsInt()
  @IsNotEmpty()
  eventId: number;

  @ApiPropertyOptional({ description: 'Cấu hình điều kiện dạng JSON', example: {} })
  @IsOptional()
  conditions?: any;

  @ApiPropertyOptional({ description: 'Cấu hình danh sách hành động dạng JSON', example: [] })
  @IsOptional()
  actions?: any;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
