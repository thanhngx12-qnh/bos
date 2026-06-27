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

  @ApiPropertyOptional({
    description: 'Mã xác thực OTP (Nếu nút yêu cầu ký duyệt)',
    example: '123456',
  })
  @IsString()
  @IsOptional()
  otpCode?: string;

  @ApiPropertyOptional({
    description: 'Dữ liệu ảnh con dấu Base64 đi kèm (Nếu có)',
    example: 'data:image/png;base64,...',
  })
  @IsString()
  @IsOptional()
  stampData?: string;

  @ApiPropertyOptional({
    description: 'Bố cục hiển thị thông tin chữ ký: dọc hoặc ngang',
    enum: ['vertical', 'horizontal'],
    example: 'vertical',
  })
  @IsString()
  @IsOptional()
  signatureLayout?: string;

  @ApiPropertyOptional({
    description: 'Hiển thị họ tên người ký',
    example: true,
  })
  @IsOptional()
  showSignerName?: boolean;

  @ApiPropertyOptional({
    description: 'Hiển thị vai trò/chức danh người ký',
    example: true,
  })
  @IsOptional()
  showSignerRole?: boolean;

  @ApiPropertyOptional({
    description: 'Hiển thị phòng ban người ký',
    example: true,
  })
  @IsOptional()
  showSignerDept?: boolean;

  @ApiPropertyOptional({
    description: 'Hiển thị thời gian thực hiện ký',
    example: true,
  })
  @IsOptional()
  showSigningTime?: boolean;

  @ApiPropertyOptional({
    description: 'ID của người duyệt tiếp theo được chọn động',
    example: 101,
  })
  @IsInt()
  @IsOptional()
  nextAssigneeId?: number;
}

