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
import { RedisService } from '../redis/redis.service';
import { tenantContext } from '../../prisma/tenant-context';
import { paginate, PaginateOptions } from '../../prisma/prisma.helper';

@Injectable()
export class EntitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private getCacheKey(entityId: number): string {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId || 0;
    return `tenant:${tenantId}:entity:${entityId}`;
  }

  async create(dto: CreateEntityDto) {
    const existing = await this.prisma.entity.findFirst({
      where: { code: dto.code } as any,
    });
    if (existing)
      throw new ConflictException(`Thực thể ${dto.code} đã tồn tại.`);
    return this.prisma.entity.create({ data: dto as any });
  }

  async findAll(options: PaginateOptions) {
    return paginate(this.prisma.entity, {}, options);
  }

  async findOne(id: number) {
    const cacheKey = this.getCacheKey(id);

    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      console.log(`[REDIS CACHE HIT] Lay Entity ID ${id} tu bo nho dem.`);
      return JSON.parse(cachedData);
    }

    const entity = await this.prisma.entity.findFirst({
      where: { id } as any,
      include: {
        workflows: { include: { versions: true } },
        printTemplates: true,
      },
    });
    if (!entity) throw new NotFoundException('Không tìm thấy thực thể.');

    await this.redis.set(cacheKey, JSON.stringify(entity), 3600);
    return entity;
  }

  async update(id: number, dto: UpdateEntityDto) {
    const current = await this.findOne(id);

    if (dto.code && dto.code !== current.code) {
      throw new BadRequestException(
        'Không được phép thay đổi mã định danh (Code).',
      );
    }

    const updated = await this.prisma.entity.update({
      where: { id } as any,
      data: {
        name: dto.name,
        description: dto.description,
        autoCodePattern: dto.autoCodePattern, // Đã bổ sung lại
        titlePattern: dto.titlePattern,
      } as any,
    });

    const cacheKey = this.getCacheKey(id);
    await this.redis.del(cacheKey);
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);

    const hasRecords = await this.prisma.record.findFirst({
      where: { entityId: id } as any,
    });
    if (hasRecords) {
      throw new BadRequestException(
        'Không thể xóa: Thực thể đã phát sinh dữ liệu.',
      );
    }

    const deleted = await this.prisma.entity.delete({ where: { id } as any });

    const cacheKey = this.getCacheKey(id);
    await this.redis.del(cacheKey);
    return deleted;
  }
}
