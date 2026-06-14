// File: src/modules/entities/dto/create-entity.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEntityDto {
  @ApiProperty({
    description: 'Tên hiển thị của Entity',
    example: 'Phiếu đề xuất mua sắm',
  })
  @Transform(({ value }) => value?.trim()) // Cắt khoảng trắng 2 đầu
  @IsString()
  @IsNotEmpty()
  @Length(3, 50, { message: 'Tên biểu mẫu phải từ 3 đến 50 ký tự' })
  name: string;

  @ApiProperty({
    description: 'Mã code duy nhất, viết hoa không dấu',
    example: 'PURCHASE_REQUEST',
  })
  @Transform(({ value }) => value?.trim()) // Cắt khoảng trắng 2 đầu
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Mã code chỉ được chứa chữ in hoa, số và dấu gạch dưới',
  })
  code: string;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết' })
  @IsString()
  @IsOptional()
  description?: string;

  // THUỘC TÍNH MỚI: Cho phép Admin cấu hình mẫu tự sinh mã khi tạo/sửa Biểu mẫu
  @ApiPropertyOptional({
    description: 'Mẫu tự sinh mã nghiệp vụ (Hỗ trợ cấu hình dạng SEQ)',
    example: 'QTMS-{SEQ:4}', // QTMS-0001, QTMS-0002...
  })
  @IsString()
  @IsOptional()
  autoCodePattern?: string;
}
