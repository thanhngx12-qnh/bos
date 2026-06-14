// File: src/modules/workflows/dto/workflow-action.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class WorkflowActionDto {
  @ApiProperty({
    description: 'Hành động phê duyệt',
    example: 'APPROVE',
    enum: ['APPROVE', 'REJECT'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['APPROVE', 'REJECT'], {
    message: 'Hành động phải là APPROVE hoặc REJECT',
  })
  action: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({
    description: 'Ý kiến phê duyệt',
    example: 'Đồng ý cấp ngân sách.',
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
