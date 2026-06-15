// File: src/modules/tenants/dto/update-tenant.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto';

// Chặn đổi mã định danh "code" của doanh nghiệp để bảo toàn cấu hình S3/R2 và phân tách Tenant
export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, ['code'] as const),
) {}
