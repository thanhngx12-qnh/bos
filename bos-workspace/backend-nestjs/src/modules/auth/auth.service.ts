// File: src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async registerTenant(dto: RegisterTenantDto) {
    // SỬA LỖI: Dùng findFirst thay vì findUnique
    const existingTenant = await this.prisma.tenant.findFirst({
      where: { code: dto.tenantCode },
    });
    if (existingTenant) {
      throw new ConflictException(
        `Mã doanh nghiệp '${dto.tenantCode}' đã tồn tại trong hệ thống.`,
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException(
        `Email quản trị '${dto.adminEmail}' đã được đăng ký.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // SỬA LỖI: Ép kiểu as any để bỏ qua ràng buộc quan hệ
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          code: dto.tenantCode,
        } as any,
      });

      const role = await tx.role.create({
        data: {
          name: 'System Admin',
          tenantId: tenant.id,
          permissions: {
            users: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
            entities: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
            workflows: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
            print_templates: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
          },
        } as any,
      });

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(dto.adminPassword, saltRounds);

      const adminUser = await tx.user.create({
        data: {
          email: dto.adminEmail,
          password: hashedPassword,
          fullName: dto.adminFullName,
          tenantId: tenant.id,
          roleId: role.id,
          userType: 'INTERNAL',
        } as any,
      });

      const { password, ...adminInfo } = adminUser;
      return {
        message: 'Đăng ký doanh nghiệp SaaS thành công!',
        tenant: tenant,
        admin: adminInfo,
      };
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmailForAuth(loginDto.email);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Email không tồn tại hoặc tài khoản đã bị khóa.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu không chính xác.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
    };

    const { password, ...userInfo } = user;
    return {
      message: 'Đăng nhập thành công',
      accessToken: this.jwtService.sign(payload),
      user: userInfo,
    };
  }
}
