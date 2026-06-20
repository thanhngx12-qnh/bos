// File: src/modules/users/users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { paginate, PaginateOptions } from '../../prisma/prisma.helper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    // 1. Kiểm tra xem email đã tồn tại trong Tenant hiện tại chưa
    const existingInTenant = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existingInTenant) {
      throw new ConflictException('Thành viên với email này đã tồn tại trong doanh nghiệp.');
    }

    // 2. Tìm kiếm email trên toàn hệ thống (bất kỳ tenant nào) để đồng bộ mật khẩu
    const globalUser = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        tenantId: { gte: 0 }, // bypass prisma auto-inject
      },
    });

    let hashedPassword = '';
    if (globalUser) {
      // Đồng bộ/sử dụng lại mật khẩu đã có của tài khoản này
      hashedPassword = globalUser.password;
    } else {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(dto.password, saltRounds);
    }

    const user = await this.prisma.user.create({
      data: {
        ...dto,
        password: hashedPassword,
        userType: 'INTERNAL', // Mặc định là INTERNAL cho thành viên mới
      } as any,
    });

    const { password, ...result } = user;
    return result;
  }

  async findAll(options: PaginateOptions) {
    const result = await paginate(this.prisma.user, {}, options, {
      department: { select: { id: true, name: true } },
      role: { select: { id: true, name: true } },
    });

    result.data = result.data.map((user: any) => {
      const { password, ...safeUser } = user;
      return safeUser;
    });

    return result;
  }

  async findOne(id: number) {
    // SỬA LỖI: findFirst và as any
    const user = await this.prisma.user.findFirst({
      where: { id } as any,
      include: {
        department: { select: { id: true, name: true } },
        role: { select: { id: true, name: true, permissions: true } },
      },
    });

    if (!user) throw new NotFoundException('Không tìm thấy người dùng.');

    const { password, ...result } = user;
    return result;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: dto.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email này đã thuộc về người dùng khác.');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id } as any,
      data: dto as any,
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  async remove(id: number) {
    await this.findOne(id);
    const deletedUser = await this.prisma.user.delete({ where: { id } as any });

    const { password, ...result } = deletedUser;
    return result;
  }

  async findByEmailForAuth(email: string) {
    return this.prisma.user.findFirst({
      where: { email },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });
  }
}
