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
          entityId: dto.entityId,
        },
      } as any,
    });

    await this.invalidateEntityCache(dto.entityId);
    return newField;
  }

  // --- BẢN VÁ TỐI ƯU HÓA: DÙNG PRISMA JSON FILTER ĐỂ TÌM KIẾM TRỰC TIẾP TRÊN DATABASE ---
  async findAllByEntity(entityId: number) {
    const fields = await this.prisma.fieldRegistry.findMany({
      where: {
        config: {
          path: ['entityId'],
          equals: entityId,
        },
      } as any,
    });

    // Sắp xếp lại trên RAM (vì mảng này rất nhỏ, thường chỉ dưới 50 trường)
    return fields.sort((a, b) => {
      const aOrder = (a.config as any)?.orderIndex || 0;
      const bOrder = (b.config as any)?.orderIndex || 0;
      return aOrder - bOrder;
    });
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
