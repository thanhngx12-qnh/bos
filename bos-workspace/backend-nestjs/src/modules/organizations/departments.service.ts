// File: src/modules/organizations/departments.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { tenantContext } from '../../prisma/tenant-context';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto) {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId;
    if (!tenantId)
      throw new BadRequestException('Không tìm thấy thông tin Tenant.');

    return this.prisma.$transaction(async (tx) => {
      const newDept = await tx.department.create({
        data: {
          name: dto.name,
          parentId: dto.parentId,
        } as any, // SỬA LỖI: as any
      });

      await tx.departmentClosure.create({
        data: {
          tenantId: tenantId,
          ancestorId: newDept.id,
          descendantId: newDept.id,
          depth: 0,
        } as any, // SỬA LỖI: as any
      });

      if (dto.parentId) {
        const rawQuery = `
          INSERT INTO department_closure (tenant_id, ancestor_id, descendant_id, depth)
          SELECT $1, ancestor_id, $2, depth + 1
          FROM department_closure
          WHERE descendant_id = $3 AND tenant_id = $1;
        `;
        await tx.$executeRawUnsafe(
          rawQuery,
          tenantId,
          newDept.id,
          dto.parentId,
        );
      }

      return newDept;
    });
  }

  async getTree() {
    const departments = await this.prisma.department.findMany({
      where: { deletedAt: null } as any, // SỬA LỖI: as any
      orderBy: { id: 'asc' },
    });

    const map = new Map<number, any>();
    const tree: any[] = [];

    departments.forEach((dept) => map.set(dept.id, { ...dept, children: [] }));
    departments.forEach((dept) => {
      if (dept.parentId && map.has(dept.parentId)) {
        map.get(dept.parentId).children.push(map.get(dept.id));
      } else {
        tree.push(map.get(dept.id));
      }
    });
    return tree;
  }

  async getDescendants(departmentId: number) {
    const descendants = await this.prisma.departmentClosure.findMany({
      where: {
        ancestorId: departmentId,
        depth: { gt: 0 },
      } as any, // SỬA LỖI: as any
      include: { descendant: true } as any,
    });
    return descendants.map((d: any) => d.descendant);
  }

  async findOne(id: number) {
    const department = await this.prisma.department.findFirst({
      where: { id, deletedAt: null } as any, // SỬA LỖI: findFirst & as any
    });
    if (!department) throw new NotFoundException('Không tìm thấy phòng ban.');
    return department;
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    await this.findOne(id);

    if ((dto as any).parentId !== undefined) {
      throw new BadRequestException(
        'Không được phép thay đổi phòng ban cha. Vui lòng tạo mới nếu cần thay đổi cấu trúc.',
      );
    }

    return this.prisma.department.update({
      where: { id } as any, // SỬA LỖI: as any
      data: { name: dto.name } as any, // SỬA LỖI: as any
    });
  }

  // === BẢN VÁ SỬA CHỮ KÝ HÀM: HỖ TRỢ ĐỦ ĐỐI SỐ USERID ĐỂ SOFT DELETE === [1]
  async remove(id: number, userId?: number) {
    const dept = await this.prisma.department.findFirst({
      where: { id } as any,
    });
    if (!dept) {
      throw new NotFoundException('Không tìm thấy Phòng ban cần xóa.');
    }

    try {
      // Nếu có truyền userId từ Controller, tiến hành XÓA MỀM (Soft Delete) [1]
      if (userId) {
        return await this.prisma.department.update({
          where: { id } as any,
          data: {
            deletedAt: new Date(),
            deletedById: userId,
          } as any,
        });
      }

      // Nếu không có, tiến hành XÓA CỨNG (Hard Delete)
      return await this.prisma.department.delete({ where: { id } as any });
    } catch (error) {
      // Đánh chặn lỗi ràng buộc khóa ngoại nếu thực hiện Hard Delete [1]
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Không thể xóa phòng ban này vì đang có dữ liệu nhân viên liên kết hoặc các phòng ban con trực thuộc hoạt động.',
        );
      }
      throw error;
    }
  }
}
