// File: src/modules/departments/dto/update-department.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateDepartmentDto } from './create-department.dto';

// ĐẠO LUẬT SỐ 2: Cấm sửa parentId sau khi đã tạo để bảo vệ đồ thị
export class UpdateDepartmentDto extends PartialType(
  OmitType(CreateDepartmentDto, ['parentId'] as const),
) {}
