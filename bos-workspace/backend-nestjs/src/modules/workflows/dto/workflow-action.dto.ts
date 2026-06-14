// File: src/modules/workflows/dto/workflow-action.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class WorkflowActionDto {
  @ApiProperty({
    description: 'ID của đường nối (Nút bấm) mà người dùng chọn kích hoạt',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  transitionId: number;

  @ApiPropertyOptional({
    description: 'Ý kiến phê duyệt',
    example: 'Đồng ý chuyển tiếp hồ sơ.',
  })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({
    description:
      'Mã chữ ký điện tử hoặc chuỗi nét vẽ Base64 (Nếu nút yêu cầu ký duyệt)',
    example: 'SIGNED_BY_ADMIN_MD5_789abc',
  })
  @IsString()
  @IsOptional()
  signatureData?: string;
}
