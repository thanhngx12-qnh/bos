// File: src/modules/roles/dto/create-role.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: 'Tên vai trò', example: 'System Admin' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ 
    description: 'Cấu hình quyền dạng JSON', 
    example: { users: ["CREATE", "READ", "UPDATE", "DELETE"], workflows: ["READ"] } 
  })
  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;
}