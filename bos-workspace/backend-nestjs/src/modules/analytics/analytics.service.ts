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
  async getSpendingByDepartment() {
    try {
      // Sử dụng raw query để tận dụng sức mạnh bóc tách JSONB của PostgreSQL
      // Quy tắc mã hóa: Ép kiểu dữ liệu (data->>'total_amount')::numeric để tính SUM không bị lỗi
      const result = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          d.name as "departmentName", 
          COALESCE(SUM((r.data->>'total_amount')::numeric), 0) as "totalSpending"
        FROM records r
        JOIN users u ON r.created_by = u.id
        JOIN departments d ON u.department_id = d.id
        WHERE r.entity_id = 1
        GROUP BY d.name
        ORDER BY "totalSpending" DESC;
      `);

      // Xử lý kiểu dữ liệu BigInt/Decimal trả về từ raw query của PostgreSQL sang dạng Number/String
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
