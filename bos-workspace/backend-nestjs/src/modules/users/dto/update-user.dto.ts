// File: src/modules/users/dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

// Update không cho phép đổi password trực tiếp qua API này (Nên làm API đổi pass riêng)
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}