// File: src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service'; // <-- IMPORT PRISMA SERVICE
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto'; // <-- IMPORT DTO MỚI
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService, // <-- INJECT PRISMA SERVICE TOÀN CỤC
  ) {}

  // ====================================================
  // API KHỞI TẠO DOANH NGHIỆP SAAS (TENANT ONBOARDING)
  // ====================================================
  async registerTenant(dto: RegisterTenantDto) {
    // 1. Kiểm tra trùng lặp mã doanh nghiệp (Tenant Code)
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { code: dto.tenantCode },
    });
    if (existingTenant) {
      throw new ConflictException(
        `Mã doanh nghiệp '${dto.tenantCode}' đã tồn tại trong hệ thống.`,
      );
    }

    // 2. Kiểm tra trùng lặp Email quản trị
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException(
        `Email quản trị '${dto.adminEmail}' đã được đăng ký.`,
      );
    }

    // 3. Thực thi Transaction nguyên tử
    return this.prisma.$transaction(async (tx) => {
      // 3.1 Khởi tạo doanh nghiệp mới (Tenant)
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          code: dto.tenantCode,
        },
      });

      // 3.2 Khởi tạo vai trò Quản trị viên cao cấp mặc định cho riêng Tenant này
      const role = await tx.role.create({
        data: {
          name: 'System Admin',
          permissions: {
            users: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
            entities: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
            workflows: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
            print_templates: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
          },
        },
      });

      // 3.3 Mã hóa mật khẩu Admin bằng Bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(dto.adminPassword, saltRounds);

      // 3.4 Khởi tạo tài khoản Admin và gán cứng liên kết với Tenant và Role vừa sinh
      const adminUser = await tx.user.create({
        data: {
          email: dto.adminEmail,
          password: hashedPassword,
          fullName: dto.adminFullName,
          tenantId: tenant.id, // Liên kết tự động
          roleId: role.id, // Liên kết tự động
          userType: 'INTERNAL',
        },
      });

      // Trả về dữ liệu sạch (không bao gồm password)
      const { password, ...adminInfo } = adminUser;
      return {
        message: 'Đăng ký doanh nghiệp SaaS thành công!',
        tenant: tenant,
        admin: adminInfo,
      };
    });
  }

  async login(loginDto: LoginDto) {
    // 1. Tìm người dùng qua email
    const user = await this.usersService.findByEmailForAuth(loginDto.email);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Email không tồn tại hoặc tài khoản đã bị khóa.',
      );
    }

    // 2. Kiểm tra mật khẩu (So sánh hash)
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu không chính xác.');
    }

    // 3. Tạo Payload chứa thông tin cơ bản đưa vào Token
    const payload = {
      sub: user.id, // Subject thường dùng lưu ID
      email: user.email,
      roleId: user.roleId,
    };

    // 4. Trả về JWT Token và thông tin user (loại bỏ password)
    const { password, ...userInfo } = user;
    return {
      message: 'Đăng nhập thành công',
      accessToken: this.jwtService.sign(payload),
      user: userInfo,
    };
  }
}
