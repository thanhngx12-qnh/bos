// File: src/modules/tasks/dto/complete-task.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CompleteTaskDto {
  @ApiPropertyOptional({
    description: 'Ý kiến khi hoàn thành nhiệm vụ',
    example: 'Đã kiểm tra xong.',
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
