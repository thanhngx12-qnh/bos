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

  async remove(id: number, userType?: string) {
    await this.findOne(id);

    const hasRecords = await this.prisma.record.findFirst({
      where: { entityId: id } as any,
    });
    if (hasRecords && userType !== 'SUPER_ADMIN') {
      throw new BadRequestException(
        'Không thể xóa: Thực thể đã phát sinh dữ liệu.',
      );
    }

    if (hasRecords && userType === 'SUPER_ADMIN') {
      await this.clearEntityData(id);
    }

    const deleted = await this.prisma.entity.delete({ where: { id } as any });

    const cacheKey = this.getCacheKey(id);
    await this.redis.del(cacheKey);
    return deleted;
  }

  private async clearEntityData(entityId: number) {
    return this.prisma.$transaction(async (tx) => {
      const records = await tx.record.findMany({
        where: { entityId } as any,
        select: { id: true },
      });
      const recordIds = records.map((r: any) => r.id);

      if (recordIds.length > 0) {
        const instances = await tx.workflowInstance.findMany({
          where: { recordId: { in: recordIds } } as any,
          select: { id: true },
        });
        const instanceIds = instances.map((i: any) => i.id);

        if (instanceIds.length > 0) {
          await tx.workflowLog.deleteMany({ where: { instanceId: { in: instanceIds } } as any });
          await tx.workflowParticipant.deleteMany({ where: { instanceId: { in: instanceIds } } as any });
          await tx.workflowInstance.deleteMany({ where: { id: { in: instanceIds } } as any });
        }

        await tx.recordRelation.deleteMany({ where: { sourceRecordId: { in: recordIds } } as any });
        await tx.recordRelation.deleteMany({ where: { targetRecordId: { in: recordIds } } as any });
        await tx.record.deleteMany({ where: { id: { in: recordIds } } as any });
      }

      const workflows = await tx.workflow.findMany({
        where: { entityId } as any,
        select: { id: true },
      });
      const workflowIds = workflows.map((w: any) => w.id);
      if (workflowIds.length > 0) {
        const versionIds = (
          await tx.workflowVersion.findMany({
            where: { workflowId: { in: workflowIds } } as any,
            select: { id: true },
          })
        ).map((v: any) => v.id);
        if (versionIds.length > 0) {
          const stepIds = (
            await tx.workflowStep.findMany({
              where: { versionId: { in: versionIds } } as any,
              select: { id: true },
            })
          ).map((s: any) => s.id);
          if (stepIds.length > 0) {
            await tx.workflowTransition.deleteMany({
              where: { OR: [{ fromStepId: { in: stepIds } }, { toStepId: { in: stepIds } }] } as any,
            });
          }
        }
        await tx.workflow.deleteMany({ where: { id: { in: workflowIds } } as any });
      }

      await tx.webhookEndpoint.deleteMany({ where: { entityId } } as any);
      await tx.printTemplate.deleteMany({ where: { entityId } } as any);
      await tx.relationDefinition.deleteMany({
        where: { OR: [{ sourceEntityId: entityId }, { targetEntityId: entityId }] } as any,
      });
      await tx.entityVersion.deleteMany({ where: { entityId } } as any);
    });
  }

  async clearAllData() {
    const entities = await this.prisma.entity.findMany({
      select: { id: true },
    });
    const entityIds = entities.map((e: any) => e.id);
    if (entityIds.length === 0) return { deleted: 0 };

    for (const id of entityIds) {
      await this.clearEntityData(id);
    }

    const store = tenantContext.getStore();
    const tenantId = store?.tenantId;

    await this.prisma.$transaction(async (tx) => {
      await tx.fieldRegistry.deleteMany({ where: { tenantId } } as any);
      await tx.entity.deleteMany({ where: { id: { in: entityIds } } as any });
      await tx.sequenceCounter.deleteMany({ where: { tenantId } } as any);
    });

    return { deleted: entityIds.length };
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
