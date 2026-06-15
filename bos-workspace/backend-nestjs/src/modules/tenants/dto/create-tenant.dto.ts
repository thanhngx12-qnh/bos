// File: src/modules/tenants/dto/create-tenant.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTenantDto {
  @ApiProperty({
    example: 'Công ty Cổ phần Vận tải BOS',
    description: 'Tên doanh nghiệp',
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @Length(3, 100, { message: 'Tên doanh nghiệp phải từ 3 đến 100 ký tự' })
  name: string;

  @ApiProperty({
    example: 'vantai_bos',
    description: 'Mã doanh nghiệp (snake_case viết thường)',
  })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Mã doanh nghiệp chỉ chứa chữ thường, số và gạch dưới (VD: company_a)',
  })
  code: string;
}
