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

  async findVersions(tenantId: number, entityId: number) {
    return this.prisma.entityVersion.findMany({
      where: { entityId, tenantId } as any,
      orderBy: { version: 'desc' } as any,
    });
  }

  async restoreVersion(tenantId: number, entityId: number, versionId: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get target version
      const version = await tx.entityVersion.findFirst({
        where: { id: versionId, entityId, tenantId } as any,
      });
      if (!version) throw new NotFoundException('Không tìm thấy phiên bản yêu cầu.');

      // 2. Get current fields of the entity
      const currentFields = await tx.fieldRegistry.findMany({
        where: {
          config: {
            path: ['entityId'],
            equals: entityId,
          },
        } as any,
      });

      const currentFieldIds = currentFields.map((f: any) => f.id);

      // 3. Delete current fields
      if (currentFieldIds.length > 0) {
        await tx.fieldRegistry.deleteMany({
          where: { id: { in: currentFieldIds } } as any,
        });
      }

      // 4. Restore fields from snapshot
      const snapshotFields = (version.fieldsSnapshot || []) as any[];
      for (const f of snapshotFields) {
        await tx.fieldRegistry.create({
          data: {
            tenantId,
            code: f.code,
            name: f.name,
            type: f.type,
            config: f.config,
          } as any,
        });
      }

      // 5. Create a new EntityVersion snapshot for this restore action (increment version number)
      const latestVersion = await tx.entityVersion.findFirst({
        where: { entityId, tenantId } as any,
        orderBy: { version: 'desc' } as any,
      });
      const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

      const newVersion = await tx.entityVersion.create({
        data: {
          tenantId,
          entityId,
          version: nextVersion,
          status: 'PUBLISHED',
          snapshotHash: `restore-from-v${version.version}-${Date.now()}`,
          fieldsSnapshot: version.fieldsSnapshot,
        } as any,
      });

      // Invalidate entity cache
      const cacheKey = this.getCacheKey(entityId);
      await this.redis.del(cacheKey);

      return newVersion;
    });
  }
}
