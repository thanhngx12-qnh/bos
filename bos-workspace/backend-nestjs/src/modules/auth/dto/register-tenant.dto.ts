// File: src/modules/auth/dto/register-tenant.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterTenantDto {
  @ApiProperty({
    example: 'Công ty Cổ phần Vận tải BOS',
    description: 'Tên doanh nghiệp muốn đăng ký',
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @Length(3, 100, { message: 'Tên doanh nghiệp phải từ 3 đến 100 ký tự' })
  tenantName: string;

  @ApiProperty({
    example: 'vantai_bos',
    description: 'Mã định danh duy nhất (snake_case viết thường)',
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Mã doanh nghiệp chỉ chứa chữ thường, số và gạch dưới (VD: company_a)',
  })
  tenantCode: string;

  @ApiProperty({
    example: 'admin@vantaibos.com',
    description: 'Email quản trị viên đầu tiên',
  })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty()
  adminEmail: string;

  @ApiProperty({
    example: 'Admin@123',
    description: 'Mật khẩu quản trị (tối thiểu 6 ký tự)',
  })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự trở lên' })
  adminPassword: string;

  @ApiProperty({
    example: 'Nguyễn Văn Admin',
    description: 'Họ và tên Quản trị viên',
  })
  @IsString()
  @IsNotEmpty()
  adminFullName: string;
}
