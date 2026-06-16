// File: src/modules/fields/fields.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { RedisService } from '../redis/redis.service';
import { tenantContext } from '../../prisma/tenant-context';

@Injectable()
export class FieldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async invalidateEntityCache(entityId: number) {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId || 0;
    const cacheKey = `tenant:${tenantId}:entity:${entityId}`;
    await this.redis.del(cacheKey);
    console.log(
      `[REDIS CACHE INVALIDATE] Da xoa Cache cho Entity ID ${entityId} vi danh sach Fields co thay doi.`,
    );
  }

  async create(dto: CreateFieldDto) {
    const entity = await this.prisma.entity.findFirst({
      where: { id: dto.entityId } as any,
    });
    if (!entity) throw new NotFoundException('Không tìm thấy Entity.');

    // SỬA LỖI 500: Bảng FieldRegistry V8.1 không có cột vật lý entityId.
    // Field code là unique trên toàn bộ Tenant.
    const existingField = await this.prisma.fieldRegistry.findFirst({
      where: {
        code: dto.code,
      } as any,
    });

    if (existingField) {
      throw new ConflictException(
        `Mã trường '${dto.code}' đã tồn tại trong Từ điển dữ liệu (Field Registry).`,
      );
    }

    let finalOrderIndex = dto.orderIndex || 1;

    const newField = await this.prisma.fieldRegistry.create({
      data: {
        name: dto.name,
        code: dto.code,
        type: dto.type,
        config: {
          isRequired: dto.isRequired ?? false,
          options: dto.options ?? {},
          orderIndex: finalOrderIndex,
          entityId: dto.entityId, // V8.1: Phải lưu entityId vào trong cục JSON config để móc nối
        },
      } as any,
    });

    await this.invalidateEntityCache(dto.entityId);
    return newField;
  }

  async findAllByEntity(entityId: number) {
    // V8.1: Lấy tất cả field của Tenant, sau đó lọc theo entityId trong JSON config
    const fields = await this.prisma.fieldRegistry.findMany();
    return fields.filter((f) => (f.config as any)?.entityId === entityId);
  }

  async findOne(id: number) {
    const field = await this.prisma.fieldRegistry.findFirst({
      where: { id } as any,
    });
    if (!field) throw new NotFoundException('Không tìm thấy trường dữ liệu.');
    return field;
  }

  async update(id: number, dto: UpdateFieldDto) {
    const current = await this.findOne(id);

    const updatedField = await this.prisma.fieldRegistry.update({
      where: { id } as any,
      data: {
        name: dto.name,
        type: dto.type,
        config: {
          isRequired: dto.isRequired,
          options: dto.options ?? undefined,
          orderIndex: dto.orderIndex,
          entityId: (current.config as any)?.entityId, // Giữ nguyên móc nối
        },
      } as any,
    });

    await this.invalidateEntityCache((updatedField.config as any)?.entityId);
    return updatedField;
  }

  async remove(id: number) {
    const field = await this.findOne(id);
    const entityId = (field.config as any)?.entityId;

    if (entityId) {
      const hasRecords = await this.prisma.record.findFirst({
        where: { entityId: entityId } as any,
      });
      if (hasRecords) {
        throw new BadRequestException(
          'Không thể xóa trường: Biểu mẫu này đã phát sinh dữ liệu vận hành.',
        );
      }
    }

    const deletedField = await this.prisma.fieldRegistry.delete({
      where: { id } as any,
    });

    if (entityId) {
      await this.invalidateEntityCache(entityId);
    }
    return deletedField;
  }
}
