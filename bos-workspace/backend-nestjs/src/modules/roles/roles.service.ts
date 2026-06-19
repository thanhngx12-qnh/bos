// File: src/modules/roles/roles.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
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
      } as any, // SỬA LỖI: as any
    });
  }

  async findAll(options: PaginateOptions) {
    return paginate(this.prisma.role, {}, options);
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findFirst({ where: { id } as any });
    if (!role) throw new NotFoundException('Không tìm thấy vai trò.');
    return role;
  }

  async update(id: number, dto: UpdateRoleDto) {
    await this.findOne(id);
    return this.prisma.role.update({
      where: { id } as any,
      data: {
        ...dto,
        permissions: dto.permissions ?? undefined,
      } as any,
    });
  }

  async remove(id: number) {
    // 1. Kiểm tra sự tồn tại của Vai trò trước khi xóa
    const role = await this.prisma.role.findFirst({ where: { id } as any });
    if (!role) {
      throw new NotFoundException('Không tìm thấy Vai trò cần xóa.');
    }

    try {
      // 2. Tiến hành xóa cứng Vai trò khỏi hệ thống
      return await this.prisma.role.delete({ where: { id } as any });
    } catch (error) {
      // === BẢN VÁ BẢO MỆT: ĐÁNH CHẶN LỖI RÀNG BUỘC KHÓA NGOẠI (P2003) === [1]
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Không thể xóa vai trò này vì đang có dữ liệu tài khoản thành viên liên kết sử dụng.',
        );
      }
      throw error;
    }
  }
}
