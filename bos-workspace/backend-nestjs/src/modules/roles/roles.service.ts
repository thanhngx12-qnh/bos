// File: src/modules/roles/roles.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { paginate, PaginateOptions } from '../../prisma/prisma.helper';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        name: dto.name,
        permissions: dto.permissions || {},
      },
    });
  }

  async findAll(options: PaginateOptions) {
    return paginate(this.prisma.role, {}, options);
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Không tìm thấy vai trò.');
    return role;
  }

  async update(id: number, dto: UpdateRoleDto) {
    await this.findOne(id);
    return this.prisma.role.update({
      where: { id },
      data: {
        ...dto,
        permissions: dto.permissions ?? undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.role.delete({ where: { id } });
  }
}
