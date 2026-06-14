// File: src/modules/organizations/dto/create-department.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ description: 'Tên phòng ban', example: 'Phòng Kỹ thuật' })
  @IsString({ message: 'Tên phòng ban phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên phòng ban không được để trống' })
  name: string;

  @ApiPropertyOptional({ description: 'ID của phòng ban cha (nếu có)', example: 1 })
  @IsInt({ message: 'ID phòng ban cha phải là số nguyên' })
  @IsOptional()
  parentId?: number;
}