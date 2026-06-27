// File: src/modules/analytics/analytics.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- BÁO CÁO 1: THỐNG KÊ LƯỢNG BẢN GHI THEO BIỂU MẪU (Group-level) ---
  async getEntitiesSummary() {
    try {
      return await this.prisma.entity.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          _count: {
            select: { records: true }, // Đếm tổng số bản ghi (Records) đã tạo
          },
        },
        orderBy: { id: 'asc' },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi truy xuất báo cáo biểu mẫu.',
      );
    }
  }

  // --- BÁO CÁO 2: THỐNG KÊ HIỆU SUẤT DUYỆT QUY TRÌNH (Tìm nút thắt cổ chai) ---
  async getWorkflowsSummary() {
    try {
      const summary = await this.prisma.workflowInstance.groupBy({
        by: ['status'],
        _count: {
          _all: true,
        },
      });

      // Format lại kết quả cho trang trọng, chuẩn chỉ
      return summary.map((item) => ({
        status: item.status, // IN_PROGRESS, COMPLETED, REJECTED
        count: item._count._all,
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi truy xuất báo cáo quy trình.',
      );
    }
  }

  // --- BÁO CÁO 3: THỐNG KÊ TIÊU DÙNG THEO PHÒNG BAN (Aggregating JSONB) ---
  // Phép toán vĩ mô: Cộng dồn total_amount từ JSONB group theo Department của người tạo Record
  async getSpendingByDepartment(entityId: number, amountField: string) {
    try {
      const tenantStore = anytenantContextStore();
      // Để tránh import circular dependency hoặc lỗi runtime, chúng ta sẽ import và đọc tenantContext động
      const { tenantContext: tc } = require('../../prisma/tenant-context');
      const tenantId = tc.getStore()?.tenantId || null;

      // Chuẩn hóa tên trường để chống SQL Injection
      const safeAmountField = amountField.replace(/[^a-zA-Z0-9_]/g, '');

      const result = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          COALESCE(d.name, 'Chưa phân phòng ban') as "departmentName", 
          COALESCE(SUM((COALESCE(r.data->>'${safeAmountField}', '0'))::numeric), 0) as "totalSpending"
        FROM records r
        JOIN users u ON r.created_by_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE r.entity_id = $1
          AND (r.tenant_id = $2 OR (r.tenant_id IS NULL AND $2 IS NULL))
        GROUP BY d.name
        ORDER BY "totalSpending" DESC;
      `, entityId, tenantId);

      return result.map((item) => ({
        departmentName: item.departmentName,
        totalSpending: Number(item.totalSpending),
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi truy xuất báo cáo ngân sách phòng ban.',
      );
    }
  }
}

// Hàm phụ để tránh lỗi compile nếu import bị thiếu
function anytenantContextStore() {
  try {
    const { tenantContext } = require('../../prisma/tenant-context');
    return tenantContext.getStore();
  } catch (e) {
    return null;
  }
}
