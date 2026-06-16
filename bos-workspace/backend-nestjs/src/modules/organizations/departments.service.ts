// File: src/modules/organizations/departments.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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

  async remove(id: number, userId: number) {
    await this.findOne(id);

    const hasActiveChildren = await this.prisma.departmentClosure.findFirst({
      where: {
        ancestorId: id,
        depth: 1,
        descendant: {
          deletedAt: null,
        },
      } as any, // SỬA LỖI: as any
    });

    if (hasActiveChildren) {
      throw new BadRequestException(
        'Không thể xóa vì đang có phòng ban con trực thuộc đang hoạt động.',
      );
    }

    return this.prisma.department.update({
      where: { id } as any, // SỬA LỖI: as any
      data: {
        deletedAt: new Date(),
        deletedById: userId,
      } as any, // SỬA LỖI: as any
    });
  }
}
