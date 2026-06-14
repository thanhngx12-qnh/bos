// File: src/modules/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@bos.com', description: 'Email đăng nhập' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password@123', description: 'Mật khẩu' })
  @IsString()
  @IsNotEmpty()
  password: string;
}