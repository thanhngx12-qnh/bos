// File: src/core/engines/reference-resolver.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReferenceResolverService {
  private readonly logger = new Logger(ReferenceResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Phân tích chuỗi DSL để trả về mảng User ID người được giao việc
   */
  async resolveCandidates(
    expression: string,
    recordId: number,
    initiatorId: number,
  ): Promise<number[]> {
    if (!expression || !expression.startsWith('$')) {
      return []; // Nếu không phải biến động, bỏ qua
    }

    try {
      // 1. DSL: $initiator (Giao cho chính người tạo phiếu)
      if (expression === '$initiator') {
        return [initiatorId];
      }

      // 2. DSL: $role:ID (Giao cho toàn bộ user thuộc Role này)
      if (expression.startsWith('$role:')) {
        const roleId = parseInt(expression.split(':')[1], 10);
        if (isNaN(roleId)) return [];
        const users = await this.prisma.user.findMany({
          where: { roleId, status: 'ACTIVE' } as any,
        });
        return users.map((u) => u.id);
      }

      // 3. DSL: $initiator.manager (Giao cho phòng ban Cha của người tạo)
      if (expression === '$initiator.manager') {
        const initiator = await this.prisma.user.findFirst({
          where: { id: initiatorId } as any,
          include: { department: true } as any,
        });

        if (
          !initiator ||
          !(initiator as any).departmentId ||
          !(initiator as any).department.parentId
        ) {
          return [];
        }

        const parentDeptId = (initiator as any).department.parentId;
        const managers = await this.prisma.user.findMany({
          where: { departmentId: parentDeptId, status: 'ACTIVE' } as any,
        });
        return managers.map((u) => u.id);
      }

      // 4. DSL: $record.data.field_code (Lấy User ID từ dữ liệu người dùng nhập trên Form)
      if (expression.startsWith('$record.data.')) {
        const fieldCode = expression.split('.')[2];
        const record = await this.prisma.record.findFirst({
          where: { id: recordId } as any,
        });
        if (!record || !record.data) return [];

        const targetUserId = (record.data as any)[fieldCode];
        if (targetUserId && !isNaN(Number(targetUserId))) {
          return [Number(targetUserId)];
        }
      }

      return [];
    } catch (error) {
      this.logger.error(
        `[Resolver Engine] Lỗi giải mã biểu thức ${expression}: ${error.message}`,
      );
      return [];
    }
  }
}
