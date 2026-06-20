import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class SwitchTenantDto {
  @ApiProperty({ example: 1, description: 'ID Doanh nghiệp muốn chuyển sang (Bỏ trống để về platform root)' })
  @IsInt()
  @IsOptional()
  tenantId?: number;
}
