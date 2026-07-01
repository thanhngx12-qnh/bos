import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ForgotPasswordRequestDto {
  @ApiProperty({ example: 'it@talunglogistics.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email: string;
}

export class ForgotPasswordResetDto {
  @ApiProperty({ example: 'it@talunglogistics.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng.' })
  @IsNotEmpty({ message: 'Email không được để trống.' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'Mã xác thực OTP không được để trống.' })
  otpCode: string;

  @ApiProperty({ example: 'NewPassword123' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải chứa ít nhất 6 ký tự.' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống.' })
  newPassword: string;
}
