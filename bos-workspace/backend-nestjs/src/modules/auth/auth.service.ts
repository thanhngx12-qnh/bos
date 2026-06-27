// File: src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { SelectTenantDto } from './dto/select-tenant.dto';
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
    const users = await this.prisma.user.findMany({
      where: { email: loginDto.email, status: 'ACTIVE' },
      include: {
        tenant: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });

    if (users.length === 0) {
      throw new UnauthorizedException(
        'Email không tồn tại hoặc tài khoản đã bị khóa.',
      );
    }

    const matchingUsers: typeof users = [];
    for (const u of users) {
      const isValid = await bcrypt.compare(loginDto.password, u.password);
      if (isValid) {
        matchingUsers.push(u);
      }
    }

    if (matchingUsers.length === 0) {
      throw new UnauthorizedException('Mật khẩu không chính xác.');
    }

    if (matchingUsers.length === 1) {
      const user = matchingUsers[0];
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

    return {
      requireTenantSelect: true,
      email: loginDto.email,
      tenants: matchingUsers.map((u) => ({
        id: u.tenant.id,
        name: u.tenant.name,
        code: u.tenant.code,
      })),
    };
  }

  async loginSelectTenant(dto: SelectTenantDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId: dto.tenantId, status: 'ACTIVE' },
      include: {
        tenant: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Không tìm thấy tài khoản của doanh nghiệp đã chọn.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
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

  async getMyTenants(email: string) {
    // Kiểm tra xem user có phải SUPER_ADMIN không (bằng cách tìm kiếm toàn hệ thống)
    const superAdmin = await this.prisma.user.findFirst({
      where: {
        email,
        userType: 'SUPER_ADMIN',
        status: 'ACTIVE',
        tenantId: { gte: 0 },
      },
    });

    if (superAdmin) {
      const tenants = await this.prisma.tenant.findMany({
        orderBy: { id: 'asc' },
      });
      return tenants.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
      }));
    }

    const users = await this.prisma.user.findMany({
      where: { email, status: 'ACTIVE' },
      include: { tenant: true },
    });
    return users.map((u) => ({
      id: u.tenant.id,
      name: u.tenant.name,
      code: u.tenant.code,
    }));
  }

  async switchTenant(email: string, targetTenantId?: number) {
    // 1. Kiểm tra xem user có phải SUPER_ADMIN không
    const superAdmin = await this.prisma.user.findFirst({
      where: {
        email,
        userType: 'SUPER_ADMIN',
        status: 'ACTIVE',
        tenantId: { gte: 0 },
      },
      include: {
        tenant: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });

    if (superAdmin) {
      const isSwitchingToRoot = targetTenantId === undefined || targetTenantId === null;
      let targetTenant: any = null;
      if (!isSwitchingToRoot) {
        targetTenant = await this.prisma.tenant.findUnique({
          where: { id: targetTenantId },
        });
        if (!targetTenant) {
          throw new NotFoundException('Không tìm thấy doanh nghiệp được yêu cầu.');
        }
      }

      const payload = {
        sub: superAdmin.id,
        email: superAdmin.email,
        roleId: superAdmin.roleId,
        tenantId: isSwitchingToRoot ? null : targetTenantId, // Ghi đè tenantId thành null nếu về root
      };

      const { password, ...userInfo } = superAdmin;
      (userInfo as any).tenantId = isSwitchingToRoot ? null : targetTenantId;
      (userInfo as any).tenant = targetTenant;

      return {
        message: isSwitchingToRoot
          ? 'Chuyển về Quản trị Hệ thống thành công'
          : 'Chuyển doanh nghiệp thành công (Super Admin)',
        accessToken: this.jwtService.sign(payload),
        user: userInfo,
      };
    }

    if (targetTenantId === undefined || targetTenantId === null) {
      throw new NotFoundException('ID doanh nghiệp không được bỏ trống.');
    }

    const user = await this.prisma.user.findFirst({
      where: { email, tenantId: targetTenantId, status: 'ACTIVE' },
      include: {
        tenant: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Không tìm thấy tài khoản liên kết với doanh nghiệp được yêu cầu.',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      tenantId: targetTenantId,
    };

    const { password, ...userInfo } = user;
    return {
      message: 'Chuyển doanh nghiệp thành công',
      accessToken: this.jwtService.sign(payload),
      user: userInfo,
    };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        department: true,
        tenant: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }
    const { password, ...userInfo } = user;
    return userInfo;
  }
}
