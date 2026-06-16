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
    // SỬA LỖI: findFirst
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email này đã được sử dụng.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        ...dto,
        password: hashedPassword,
      } as any, // SỬA LỖI: as any
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
    return this.prisma.user.findFirst({ where: { email } });
  }
}
