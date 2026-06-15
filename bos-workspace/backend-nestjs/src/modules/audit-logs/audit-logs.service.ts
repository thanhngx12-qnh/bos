// File: src/modules/audit-logs/audit-logs.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy lịch sử nhật ký (Tự động áp bộ lọc cô lập tenantId của Prisma Extension)
  async findAll(page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [logs, total] = await this.prisma.$transaction([
        this.prisma.systemAuditLog.findMany({
          include: {
            user: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { createdAt: 'desc' }, // Nhật ký mới nhất lên đầu
          skip,
          take: limit,
        }),
        this.prisma.systemAuditLog.count(),
      ]);

      return {
        data: logs,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi truy xuất nhật ký hành chính.',
      );
    }
  }
}
