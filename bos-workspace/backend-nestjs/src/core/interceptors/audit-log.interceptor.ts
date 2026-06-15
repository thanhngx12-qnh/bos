// File: src/core/interceptors/audit-log.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { tenantContext } from '../../prisma/tenant-context';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, ip, headers } = request;

    // 1. Chỉ ghi nhận các hành động thay đổi dữ liệu (POST, PATCH, DELETE)
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    // Bỏ qua các API không thuộc diện quản trị hành chính
    const ignoredPaths = [
      '/api/v1/auth/login',
      '/api/v1/notifications/stream',
      '/api/v1/attachments/upload',
    ];
    if (ignoredPaths.some((path) => url.includes(path))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        const user = request.user;
        if (!user) return; // Nếu chưa đăng nhập thì bỏ qua

        const store = tenantContext.getStore();

        // --- NÂNG CẤP TỰ PHỤC HỒI (SELF-HEALING) ---
        // Nếu store rỗng (không truyền header), tự động lấy tenantId từ JWT Token của user đăng nhập!
        const tenantId = store?.tenantId || user.tenantId || null;

        // 2. Tự động nhận diện thực thể (Resource) bị tác động dựa trên URL
        let resource = 'Unknown';
        if (url.includes('/entities')) resource = 'Entity';
        else if (url.includes('/fields')) resource = 'FieldDefinition';
        else if (url.includes('/workflows')) resource = 'Workflow';
        else if (url.includes('/records')) resource = 'Record';
        else if (url.includes('/users')) resource = 'User';
        else if (url.includes('/roles')) resource = 'Role';
        else if (url.includes('/departments')) resource = 'Department';
        else if (url.includes('/print-templates')) resource = 'PrintTemplate';
        else if (url.includes('/webhook-endpoints'))
          resource = 'WebhookEndpoint';
        else if (url.includes('/tenants')) resource = 'Tenant';

        // Trích xuất ID đối tượng bị tác động từ Param hoặc từ kết quả trả về của DB
        const resourceId = request.params.id
          ? Number(request.params.id)
          : response?.id
            ? Number(response.id)
            : null;

        // Bóc tách IP mạng của Client gọi lên
        const ipAddress = headers['x-forwarded-for'] || ip || '127.0.0.1';

        try {
          // 3. Ghi dữ liệu sạch vào bảng Nhật ký hệ thống
          await this.prisma.systemAuditLog.create({
            data: {
              tenantId,
              userId: user.userId,
              action: `${method}_${resource.toUpperCase()}`, // Ví dụ: "POST_ENTITY", "PATCH_USER"
              resource,
              resourceId,
              payload: body || {},
              ipAddress: String(ipAddress),
            },
          });
          this.logger.log(
            `[Audit Log] Ghi nhat ky thanh cong: ${method}_${resource.toUpperCase()}`,
          );
        } catch (error) {
          this.logger.error(
            `[Audit Log] Loi ghi nhat ky hanh chinh: ${error.message}`,
          );
        }
      }),
    );
  }
}
