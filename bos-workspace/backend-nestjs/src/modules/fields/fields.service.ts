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
import { RedisService } from '../redis/redis.service'; // <-- IMPORT REDIS
import { tenantContext } from '../../prisma/tenant-context'; // <-- IMPORT CONTEXT

@Injectable()
export class FieldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService, // <-- INJECT REDIS SERVICE
  ) {}

  // --- HÀM TRỢ GIÚP: XÓA SẠCH CACHE CỦA ENTITY CHA KHI TRƯỜNG THAY ĐỔI ---
  private async invalidateEntityCache(entityId: number) {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId || 0;
    const cacheKey = `tenant:${tenantId}:entity:${entityId}`;
    await this.redis.del(cacheKey);
    console.log(
      `[REDIS CACHE INVALIDATE] Da xoa Cache cho Entity ID ${entityId} vi danh sach Fields (Truong) co thay doi.`,
    );
  }

  async create(dto: CreateFieldDto) {
    // 1. Check Entity tồn tại
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
    });
    if (!entity) throw new NotFoundException('Không tìm thấy Entity.');

    // 2. Check trùng mã code TRONG CÙNG 1 ENTITY
    const existingField = await this.prisma.fieldDefinition.findUnique({
      where: {
        entityId_code: { entityId: dto.entityId, code: dto.code },
      },
    });

    if (existingField) {
      throw new ConflictException(
        `Mã trường '${dto.code}' đã tồn tại trong biểu mẫu này.`,
      );
    }

    // 3. Auto-calc orderIndex nếu không truyền vào
    let finalOrderIndex = dto.orderIndex;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const lastField = await this.prisma.fieldDefinition.findFirst({
        where: { entityId: dto.entityId },
        orderBy: { orderIndex: 'desc' },
      });
      finalOrderIndex = lastField ? lastField.orderIndex + 1 : 1;
    }

    const newField = await this.prisma.fieldDefinition.create({
      data: {
        entityId: dto.entityId,
        name: dto.name,
        code: dto.code,
        type: dto.type,
        isRequired: dto.isRequired ?? false,
        options: dto.options ?? {},
        orderIndex: finalOrderIndex,
      },
    });

    // KÍCH HOẠT XÓA CACHE ENTITY CHA
    await this.invalidateEntityCache(dto.entityId);

    return newField;
  }

  async findAllByEntity(entityId: number) {
    return this.prisma.fieldDefinition.findMany({
      where: { entityId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async findOne(id: number) {
    const field = await this.prisma.fieldDefinition.findUnique({
      where: { id },
    });
    if (!field) throw new NotFoundException('Không tìm thấy trường dữ liệu.');
    return field;
  }

  async update(id: number, dto: UpdateFieldDto) {
    const current = await this.findOne(id); // Check tồn tại

    const updatedField = await this.prisma.fieldDefinition.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        isRequired: dto.isRequired,
        options: dto.options ?? undefined,
        orderIndex: dto.orderIndex,
      },
    });

    // KÍCH HOẠT XÓA CACHE ENTITY CHA
    await this.invalidateEntityCache(updatedField.entityId);

    return updatedField;
  }

  async remove(id: number) {
    const field = await this.findOne(id);

    // Kiểm tra xem Entity chứa trường này đã có dữ liệu chưa.
    const hasRecords = await this.prisma.record.findFirst({
      where: { entityId: field.entityId },
    });
    if (hasRecords) {
      throw new BadRequestException(
        'Không thể xóa trường: Biểu mẫu này đã phát sinh dữ liệu vận hành.',
      );
    }

    const deletedField = await this.prisma.fieldDefinition.delete({
      where: { id },
    });

    // KÍCH HOẠT XÓA CACHE ENTITY CHA
    await this.invalidateEntityCache(deletedField.entityId);

    return deletedField;
  }
}
