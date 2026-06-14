// File: src/modules/print-templates/dto/create-template.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsObject } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ description: 'ID của Entity (Biểu mẫu)', example: 1 })
  @IsInt()
  @IsNotEmpty()
  entityId: number;

  @ApiProperty({
    description: 'Tên mẫu in',
    example: 'Mẫu quyết định mua sắm trang thiết bị',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Cấu hình mẫu in chứa HTML (Lưu trong Json)',
    example: {
      html: '<h1>PHIẾU ĐỀ XUẤT MUA SẮM</h1><p>Lý do: {{data.reason}}</p>',
    },
  })
  @IsObject()
  @IsNotEmpty()
  template: Record<string, any>;
}
