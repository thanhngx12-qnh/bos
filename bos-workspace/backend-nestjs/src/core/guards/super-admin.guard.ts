// File: src/core/guards/super-admin.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Được nạp tự động từ JwtAuthGuard

    // CHỐT CHẶN BẢO MẬT: Chỉ cho phép tài khoản Super Admin truy cập
    if (!user || user.userType !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Bạn không có quyền Quản trị tối cao (Super Admin) để truy cập chức năng này.',
      );
    }

    return true;
  }
}
