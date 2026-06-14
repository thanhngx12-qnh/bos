// File: src/core/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      // Bắt token từ Header: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'bos_super_secret_key_2026',
    });
  }

  // Hàm này tự động chạy sau khi Token được giải mã thành công
  async validate(payload: any) {
    // Truy vấn Database để lấy thông tin mới nhất (đề phòng User vừa bị xóa/khóa)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true }, // Lấy thêm thông tin Role để phục vụ Guard phân quyền
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản không hợp lệ hoặc đã bị khóa.');
    }

    // Trả về object gắn vào req.user
    return {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name, // Cần thiết cho RolesGuard
    };
  }
}