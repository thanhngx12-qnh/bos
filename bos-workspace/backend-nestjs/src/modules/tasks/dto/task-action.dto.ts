// File: src/modules/tasks/dto/task-action.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt } from 'class-validator';

export class CompleteTaskDto {
  @ApiPropertyOptional({ description: 'Ý kiến khi hoàn thành/xử lý nhiệm vụ' })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class DelegateTaskDto {
  @ApiPropertyOptional({ description: 'ID người được ủy quyền' })
  @IsInt()
  assigneeId: number;

  @ApiPropertyOptional({ description: 'Lý do ủy quyền' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BatchCompleteTasksDto {
  @ApiPropertyOptional({ description: 'Danh sách ID nhiệm vụ cần phê duyệt' })
  @IsInt({ each: true })
  taskIds: number[];

  @ApiPropertyOptional({ description: 'Ý kiến phê duyệt chung' })
  @IsString()
  @IsOptional()
  comment?: string;
}
