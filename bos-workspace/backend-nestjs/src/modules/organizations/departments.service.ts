// File: src/modules/organizations/departments.service.ts
import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto) {
    if (dto.parentId) {
      const parent = await this.prisma.department.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Không tìm thấy phòng ban cha.');
    }
    return this.prisma.department.create({ data: dto });
  }

  async getTree() {
    const departments = await this.prisma.department.findMany({ orderBy: { id: 'asc' } });
    const map = new Map<number, any>();
    const tree: any[] = [];

    departments.forEach(dept => map.set(dept.id, { ...dept, children: [] }));
    departments.forEach(dept => {
      if (dept.parentId && map.has(dept.parentId)) {
        map.get(dept.parentId).children.push(map.get(dept.id));
      } else {
        tree.push(map.get(dept.id));
      }
    });
    return tree;
  }

  async findOne(id: number) {
    const department = await this.prisma.department.findUnique({ where: { id } });
    if (!department) throw new NotFoundException('Không tìm thấy phòng ban.');
    return department;
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    await this.findOne(id); // Kiểm tra tồn tại
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('Phòng ban không thể làm cha của chính nó.');
    }
    return this.prisma.department.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    // Kiểm tra xem có phòng ban con không
    const children = await this.prisma.department.findFirst({ where: { parentId: id } });
    if (children) throw new BadRequestException('Không thể xóa vì đang có phòng ban con trực thuộc.');
    
    return this.prisma.department.delete({ where: { id } });
  }
}