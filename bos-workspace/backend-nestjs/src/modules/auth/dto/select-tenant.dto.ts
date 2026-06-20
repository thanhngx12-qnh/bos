import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsInt } from 'class-validator';

export class SelectTenantDto {
  @ApiProperty({ example: 'admin@bos.com', description: 'Email đăng nhập' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Admin@123', description: 'Mật khẩu' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 1, description: 'ID Doanh nghiệp đã chọn' })
  @IsInt()
  @IsNotEmpty()
  tenantId: number;
}
