// File: src/prisma/tenant-context.ts
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: number;
}

// Khởi tạo vùng nhớ đệm luồng xử lý (Context Thread)
export const tenantContext = new AsyncLocalStorage<TenantStore>();
