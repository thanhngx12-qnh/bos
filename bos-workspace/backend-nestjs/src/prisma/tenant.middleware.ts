// File: src/prisma/tenant.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantContext } from './tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // 1. Trích xuất Tenant ID từ Header
    const tenantIdRaw = req.headers['x-tenant-id'];
    const tenantId = tenantIdRaw ? Number(tenantIdRaw) : undefined;

    if (tenantId && !isNaN(tenantId)) {
      // 2. Chạy request trong vùng nhớ được cô lập của Tenant hiện tại
      tenantContext.run({ tenantId }, () => {
        next();
      });
    } else {
      next();
    }
  }
}
