// File: src/core/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'bos_super_secret_key_2026',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Tài khoản không hợp lệ hoặc đã bị khóa.',
      );
    }

    return {
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
      userType: user.userType, // <-- BỔ SUNG TRƯỜNG NÀY ĐỂ PHÂN BIỆT SAAS CUSTOMER
      departmentId: user.departmentId, // <-- BỔ SUNG TRƯỜNG NÀY ĐỂ LỌC THEO PHÒNG BAN
    };
  }
}
