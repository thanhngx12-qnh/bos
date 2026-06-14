// File: src/modules/attachments/dto/upload-attachment.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadAttachmentDto {
  @ApiPropertyOptional({
    description: 'ID của Bản ghi dữ liệu động (Nếu gán trực tiếp cho biểu mẫu)',
    example: 1,
  })
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsInt({ message: 'ID bản ghi phải là số nguyên' })
  @IsOptional()
  recordId?: number;
}
