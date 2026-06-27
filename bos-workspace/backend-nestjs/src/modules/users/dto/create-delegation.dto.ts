// File: src/modules/users/dto/create-delegation.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, IsISO8601 } from 'class-validator';

export class CreateDelegationDto {
  @ApiProperty({
    description: 'ID của nhân sự nhận ủy quyền phê duyệt thay thế',
    example: 2,
  })
  @IsInt()
  @IsNotEmpty()
  toUserId: number;

  @ApiProperty({
    description: 'Ngày bắt đầu hiệu lực ủy quyền (ISO string hoặc YYYY-MM-DD)',
    example: '2026-06-20',
  })
  @IsISO8601()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'Ngày kết thúc hiệu lực ủy quyền (ISO string hoặc YYYY-MM-DD)',
    example: '2026-06-21',
  })
  @IsISO8601()
  @IsNotEmpty()
  endDate: string;
}
