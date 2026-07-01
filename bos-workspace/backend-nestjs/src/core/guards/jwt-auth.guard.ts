// File: src/core/guards/jwt-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: any): Promise<boolean> {
    // 1. Chạy xác thực JWT tiêu chuẩn trước
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // User giải mã từ JWT Token

    // 2. Lấy Tenant ID từ Header hoặc Query Parameter
    const tenantIdHeader = request.headers['x-tenant-id'] || request.query['tenantId'];
    const headerTenantId = tenantIdHeader ? Number(tenantIdHeader) : undefined;

    // 3. === BẢN VÁ BẢO MẬT: SO KHỚP TENANT CONTEXT ===
    if (user && user.userType !== 'SUPER_ADMIN') {
      if (!headerTenantId) {
        throw new ForbiddenException(
          'Lỗi bảo mật: Request thiếu Header định danh Tenant x-tenant-id.',
        );
      }
      if (user.tenantId !== headerTenantId) {
        throw new ForbiddenException(
          'Lỗi bảo mật: Tenant ID trong Token và Header không trùng khớp (Cảnh báo giả mạo dữ liệu!).',
        );
      }
    }

    return true;
  }
}
