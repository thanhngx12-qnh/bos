// File: src/modules/users/dto/create-signature.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class CreateSignatureDto {
  @ApiProperty({
    description: 'Tên định danh mẫu chữ ký/con dấu',
    example: 'Chữ ký chính thức',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Kiểu mẫu chữ ký',
    enum: ['DRAW', 'IMAGE', 'STAMP'],
    example: 'DRAW',
  })
  @IsString()
  @IsIn(['DRAW', 'IMAGE', 'STAMP'])
  type: string;

  @ApiProperty({
    description: 'Dữ liệu Base64 hình ảnh chữ ký/con dấu',
    example: 'data:image/png;base64,...',
  })
  @IsString()
  @IsNotEmpty()
  signatureUrl: string;
}
