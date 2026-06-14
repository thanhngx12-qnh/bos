// File: src/modules/entities/entities.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';

@Injectable()
export class EntitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEntityDto) {
    const existing = await this.prisma.entity.findUnique({
      where: { code: dto.code },
    });
    if (existing)
      throw new ConflictException(`Thực thể ${dto.code} đã tồn tại.`);
    return this.prisma.entity.create({ data: dto });
  }

  async findAll() {
    return this.prisma.entity.findMany({ orderBy: { id: 'desc' } });
  }

  async findOne(id: number) {
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { orderIndex: 'asc' } },
        workflows: { include: { versions: true } },
        printTemplates: true, // Lấy thêm cấu hình mẫu in nếu có
      },
    });
    if (!entity) throw new NotFoundException('Không tìm thấy thực thể.');
    return entity;
  }

  async update(id: number, dto: UpdateEntityDto) {
    const current = await this.findOne(id);

    // CHẶN SỬA CODE: Đảm bảo logic Workflow/Formula không bị gãy
    if (dto.code && dto.code !== current.code) {
      throw new BadRequestException(
        'Không được phép thay đổi mã định danh (Code) sau khi đã khởi tạo.',
      );
    }

    return this.prisma.entity.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        autoCodePattern: dto.autoCodePattern, // <-- BỔ SUNG TRƯỜNG NÀY ĐỂ SỬA LỖI TRUYỀN PAYLOAD
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    // KIỂM TRA RÀNG BUỘC: Không xóa thực thể đang có dữ liệu vận hành
    const hasRecords = await this.prisma.record.findFirst({
      where: { entityId: id },
    });
    if (hasRecords) {
      throw new BadRequestException(
        'Không thể xóa: Thực thể đã phát sinh dữ liệu vận hành.',
      );
    }

    return this.prisma.entity.delete({ where: { id } });
  }
}
