// File: src/modules/fields/dto/create-field.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  IsInt,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFieldDto {
  @ApiProperty({
    description: 'ID của Entity (Biểu mẫu) chứa trường này',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  entityId: number;

  @ApiProperty({ description: 'Tên hiển thị', example: 'Tổng tiền' })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Mã trường (snake_case chữ thường)',
    example: 'total_amount',
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Mã trường chỉ được chứa chữ thường, số và dấu gạch dưới (VD: total_amount)',
  })
  code: string;

  @ApiProperty({
    description: 'Loại trường dữ liệu (TEXT, NUMBER, DATE, SELECT, FORMULA...)',
    example: 'NUMBER',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({
    description: 'Bắt buộc nhập hay không',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional({
    description:
      'Cấu hình JSON siêu chi tiết theo loại trường. Hỗ trợ requiredIf, showIf, min, max, regexPattern...',
    example: {
      placeholder: 'Nhập số tiền...',
      min: 1000,
      requiredIf: { field: 'category', operator: '==', value: 'IT' },
    },
  })
  @IsObject()
  @IsOptional()
  options?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Thứ tự hiển thị trên giao diện',
    default: 0,
  })
  @IsInt()
  @IsOptional()
  orderIndex?: number;
}
