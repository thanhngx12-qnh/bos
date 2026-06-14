// File: src/modules/users/users.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng.');
    }

    // Mã hóa mật khẩu
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        ...dto,
        password: hashedPassword,
      },
    });

    // Trả về không bao gồm password
    const { password, ...result } = user;
    return result;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: {
        department: { select: { id: true, name: true } },
        role: { select: { id: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });

    return users.map(user => {
      const { password, ...result } = user;
      return result;
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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
      const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email này đã thuộc về người dùng khác.');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dto,
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  async remove(id: number) {
    await this.findOne(id);
    const deletedUser = await this.prisma.user.delete({ where: { id } });
    
    const { password, ...result } = deletedUser;
    return result;
  }

  // Hàm nội bộ dùng cho Module Auth lát nữa
  async findByEmailForAuth(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
}