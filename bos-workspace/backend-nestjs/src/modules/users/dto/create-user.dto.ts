// File: src/modules/users/dto/create-user.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsInt } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'admin@bos.com', description: 'Email đăng nhập' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Admin@123', description: 'Mật khẩu (tối thiểu 6 ký tự)' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn Admin', description: 'Họ và tên' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ example: 1, description: 'ID Phòng ban' })
  @IsInt()
  @IsOptional()
  departmentId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID Vai trò' })
  @IsInt()
  @IsOptional()
  roleId?: number;
}