// File: src/modules/records/records.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { DynamicValidationService } from './dynamic-validation.service';
import { FormulaEngineService } from './formula-engine.service';
import { tenantContext } from '../../prisma/tenant-context';
import { OutboxService } from '../outbox/outbox.service';
import { DomainEvent } from 'src/core/interfaces/domain-event.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dynamicValidator: DynamicValidationService,
    private readonly formulaEngine: FormulaEngineService,
    private readonly outboxService: OutboxService,
  ) {}

  private createDomainEvent(
    eventType: string,
    payload: any,
    metadata: any,
  ): DomainEvent {
    return {
      eventType,
      payload,
      metadata: {
        tenantId: metadata.tenantId,
        correlationId: metadata.correlationId || uuidv4(),
        userId: metadata.userId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private generateRecordCode(pattern: string, count: number): string {
    const regex = /\{SEQ:(\d+)\}/g;
    return pattern.replace(regex, (match, length) => {
      const padLength = parseInt(length, 10);
      return String(count).padStart(padLength, '0');
    });
  }

  private generateRecordTitle(
    pattern: string | null | undefined,
    data: Record<string, any>,
    recordCode: string | null,
  ): string | null {
    if (!pattern) return null;

    return pattern.replace(/\{([^}]+)\}/g, (match, fieldCode) => {
      if (fieldCode === 'RECORD_CODE') return recordCode || '';
      const value = data[fieldCode];
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  private calculateDiff(
    oldData: any,
    newData: any,
  ): Record<string, { old: any; new: any }> {
    const diff: Record<string, { old: any; new: any }> = {};
    const oldObj = oldData as Record<string, any>;
    const newObj = newData as Record<string, any>;
    const allKeys = new Set([
      ...Object.keys(oldObj || {}),
      ...Object.keys(newObj || {}),
    ]);

    for (const key of allKeys) {
      const oldVal = oldObj[key];
      const newVal = newObj[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff[key] = { old: oldVal, new: newVal };
      }
    }
    return diff;
  }

  private async processGraphRelations(
    tx: any,
    tenantId: number,
    sourceRecordId: number,
    entityId: number,
    entityFields: any[],
    finalData: any,
  ) {
    await tx.recordRelation.deleteMany({
      where: { sourceRecordId: sourceRecordId } as any,
    });

    const lookupFields = entityFields.filter((f) => f.type === 'LOOKUP');

    for (const field of lookupFields) {
      const targetRecordIdRaw = finalData[field.code];
      const targetRecordId = Number(targetRecordIdRaw);

      if (targetRecordId && !isNaN(targetRecordId)) {
        const config: any = field.config || {};
        const options: any = config.options || {};
        const targetEntityId = options.lookupEntityId;

        if (targetEntityId) {
          let relationDef = await tx.relationDefinition.findFirst({
            where: {
              sourceEntityId: entityId,
              targetEntityId: targetEntityId,
              code: field.code,
            } as any,
          });

          if (!relationDef) {
            relationDef = await tx.relationDefinition.create({
              data: {
                tenantId,
                code: field.code,
                name: `Liên kết từ ${field.name}`,
                sourceEntityId: entityId,
                targetEntityId: targetEntityId,
                cardinality: 'MANY_TO_ONE',
              } as any,
            });
          }

          await tx.recordRelation.create({
            data: {
              tenantId,
              definitionId: relationDef.id,
              sourceRecordId: sourceRecordId,
              targetRecordId: targetRecordId,
              direction: 'FORWARD',
            } as any,
          });
        }
      }
    }
  }

  private async ensureEntityVersionExists(
    tx: any,
    tenantId: number,
    entityId: number,
  ) {
    let version = await tx.entityVersion.findFirst({
      where: { entityId, tenantId, status: 'PUBLISHED' } as any,
    });

    if (!version) {
      version = await tx.entityVersion.findFirst({
        where: { entityId, tenantId } as any,
      });
    }

    if (!version) {
      version = await tx.entityVersion.create({
        data: {
          tenantId,
          entityId,
          version: 1,
          status: 'PUBLISHED',
          snapshotHash: 'mock-hash-123',
          fieldsSnapshot: {},
        } as any,
      });
    }

    return version.id;
  }

  async create(userId: number, dto: CreateRecordDto) {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId || 0;

    const entity = await this.prisma.entity.findFirst({
      where: { id: dto.entityId } as any,
    });

    if (!entity)
      throw new NotFoundException('Không tìm thấy Biểu mẫu (Entity).');

    const fields = await this.prisma.fieldRegistry.findMany({
      where: { tenantId: (entity as any).tenantId } as any,
    });

    const entityFields = fields.filter(
      (f) => (f.config as any)?.entityId === entity.id,
    );

    const cleanData = this.dynamicValidator.validateAndSanitize(
      entityFields as any,
      dto.data,
    );

    const finalData = this.formulaEngine.calculate(
      entityFields as any,
      cleanData,
    );

    let recordCode: string | null = null;
    if (entity.autoCodePattern) {
      const recordCount = await this.prisma.record.count({
        where: { entityId: entity.id } as any,
      });
      recordCode = this.generateRecordCode(
        entity.autoCodePattern,
        recordCount + 1,
      );
    }

    const businessCode = recordCode || `CODE-${Date.now()}`;
    const generatedTitle = this.generateRecordTitle(
      (entity as any).titlePattern,
      finalData,
      businessCode,
    );

    return this.prisma.$transaction(async (tx) => {
      const validVersionId = await this.ensureEntityVersionExists(
        tx,
        tenantId,
        entity.id,
      );

      const newRecord = await tx.record.create({
        data: {
          entityId: dto.entityId,
          businessCode: businessCode,
          title: generatedTitle,
          data: finalData as any,
          createdById: userId,
          metadataVersionId: validVersionId,
        } as any,
      });

      await this.processGraphRelations(
        tx,
        tenantId,
        newRecord.id,
        entity.id,
        entityFields,
        finalData,
      );

      const event = this.createDomainEvent('record.created', newRecord, {
        tenantId,
        userId,
      });
      await this.outboxService.addToOutbox(tx, event);

      return newRecord;
    });
  }

  // ====================================================
  // ĐỘNG CƠ TRUY VẤN VẠN NĂNG TÍCH HỢP ROW-LEVEL SECURITY (BẢN FINAL V8.1)
  // ====================================================
  async findAllByEntity(
    currentUser: any,
    entityId: number,
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
    searchQuery?: string,
    filtersRaw?: string,
  ) {
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId } as any,
    });
    if (!entity) throw new NotFoundException('Không tìm thấy Biểu mẫu.');

    const fields = await this.prisma.fieldRegistry.findMany({
      where: { tenantId: (entity as any).tenantId } as any,
    });
    const entityFields = fields.filter(
      (f) => (f.config as any)?.entityId === entity.id,
    );

    const tenantStore = tenantContext.getStore();
    const tenantId = tenantStore?.tenantId || null;

    let joinSql = '';
    const filterClauses: any[] = []; // SỬA LỖI TẠI ĐÂY: KHAI BÁO KIỂU ANY[]
    const queryParams: any[] = [entityId, tenantId];
    let paramIndex = 3;

    // --- 1. ĐỘNG CƠ ROW-LEVEL SECURITY (DATA SCOPE POLICY) ---
    let policy: any = null;
    if (currentUser.roleId) {
      policy = await this.prisma.permissionPolicy.findFirst({
        where: {
          tenantId: tenantId,
          roleId: currentUser.roleId,
          entityId: entityId,
        } as any,
      });
    }

    const dataScope = policy ? policy.dataScope : 'OWNED';
    if (dataScope === 'OWNED') {
      filterClauses.push(`r.created_by_id = ${'$' + paramIndex}`);
      queryParams.push(currentUser.userId);
      paramIndex += 1;
    } else if (dataScope === 'DEPARTMENT' && currentUser.departmentId) {
      filterClauses.push(
        `r.created_by_id IN (SELECT u.id FROM users u JOIN department_closure dc ON u.department_id = dc.descendant_id WHERE dc.ancestor_id = ${'$' + paramIndex} AND dc.tenant_id = $2)`,
      );
      queryParams.push(currentUser.departmentId);
      paramIndex += 1;
    }

    // --- 2. XỬ LÝ LỌC ĐỘNG NHIỀU TRƯỜNG ---
    if (filtersRaw) {
      try {
        const filters = JSON.parse(filtersRaw);
        for (const [key, val] of Object.entries(filters)) {
          const fieldDef = entityFields.find((f) => f.code === key);
          if (fieldDef) {
            filterClauses.push(
              `r.data->>${'$' + paramIndex} = ${'$' + (paramIndex + 1)}`,
            );
            queryParams.push(key, String(val));
            paramIndex += 2;
          }
        }
      } catch (e) {
        throw new BadRequestException(
          'Định dạng bộ lọc filters (JSON) gửi lên không hợp lệ.',
        );
      }
    }

    // --- 3. XỬ LÝ TÌM KIẾM BẰNG POSTGRESQL FULL-TEXT SEARCH (TSVECTOR) ---
    if (searchQuery) {
      const plainQuery = searchQuery.trim().split(/\s+/).join(' & ');
      joinSql = ` INNER JOIN search_documents sd ON r.id = sd.record_id `;
      filterClauses.push(
        `sd.search_vector @@ plainto_tsquery('simple', ${'$' + paramIndex})`,
      );
      queryParams.push(plainQuery);
      paramIndex += 1;
    }

    const filterSql =
      filterClauses.length > 0 ? `AND ${filterClauses.join(' AND ')}` : '';

    let orderBySql = 'ORDER BY r.id DESC';
    if (sortBy) {
      const sortFieldDef = entityFields.find((f) => f.code === sortBy);
      const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      if (sortFieldDef) {
        if (['NUMBER', 'FORMULA'].includes(sortFieldDef.type)) {
          orderBySql = `ORDER BY COALESCE((r.data->>'${sortBy}')::numeric, 0) ${direction}`;
        } else {
          orderBySql = `ORDER BY r.data->>'${sortBy}' ${direction}`;
        }
      }
    }
    const offset = (page - 1) * limit;
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    queryParams.push(limit, offset);

    const sqlQuery = `
      SELECT r.* 
      FROM records r
      ${joinSql}
      WHERE r.entity_id = $1 
        AND (r.tenant_id = $2 OR (r.tenant_id IS NULL AND $2 IS NULL))
        ${filterSql}
      ${orderBySql}
      LIMIT ${'$' + limitParamIndex} OFFSET ${'$' + offsetParamIndex}
    `;

    const sqlCountQuery = `
      SELECT COUNT(r.*)::int as count
      FROM records r
      ${joinSql}
      WHERE r.entity_id = $1 
        AND (r.tenant_id = $2 OR (r.tenant_id IS NULL AND $2 IS NULL))
        ${filterSql}
    `;

    console.log('------------ DEBUG SQL QUERY ------------');
    console.log('SQL:', sqlQuery);
    console.log('PARAMS:', queryParams);
    console.log('---------------------------------------');

    const [records, countResult] = await this.prisma.$transaction([
      this.prisma.$queryRawUnsafe<any[]>(sqlQuery, ...queryParams),
      this.prisma.$queryRawUnsafe<any[]>(
        sqlCountQuery,
        ...queryParams.slice(0, queryParams.length - 2),
      ),
    ]);

    const total = countResult[0]?.count || 0;

    return {
      data: records,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const record = await this.prisma.record.findFirst({
      where: { id } as any,
      include: {
        entity: { select: { id: true, name: true, code: true } },
        outgoingRelations: true,
      } as any,
    });

    if (!record) throw new NotFoundException('Không tìm thấy bản ghi dữ liệu.');
    return record;
  }

  async update(userId: number, id: number, dto: UpdateRecordDto) {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId || 0;

    const currentRecord = await this.findOne(id);

    const entity = await this.prisma.entity.findFirst({
      where: { id: currentRecord.entityId } as any,
    });

    const fields = await this.prisma.fieldRegistry.findMany({
      where: { tenantId: (entity as any)?.tenantId } as any,
    });
    const entityFields = fields.filter(
      (f) => (f.config as any)?.entityId === entity?.id,
    );

    let dataToSave = currentRecord.data;
    let patchData = {};
    let isDataChanged = false;
    let newTitle: string | null = (currentRecord as any).title;

    if (entity && dto.data) {
      const mergedData = { ...(currentRecord.data as object), ...dto.data };

      const cleanData = this.dynamicValidator.validateAndSanitize(
        entityFields as any,
        mergedData,
      );

      dataToSave = this.formulaEngine.calculate(entityFields as any, cleanData);

      patchData = this.calculateDiff(currentRecord.data, dataToSave);
      isDataChanged = Object.keys(patchData).length > 0;

      if (isDataChanged) {
        newTitle = this.generateRecordTitle(
          (entity as any).titlePattern,
          dataToSave,
          (currentRecord as any).businessCode,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let updatedRecord: any = currentRecord;

      if (isDataChanged) {
        updatedRecord = await tx.record.update({
          where: { id } as any,
          data: {
            title: newTitle,
            data: dataToSave as any,
          },
        });

        await tx.recordRevision.create({
          data: {
            recordId: id,
            userId: userId,
            patchData: patchData as any,
          } as any,
        });

        const event = this.createDomainEvent(
          'record.updated',
          { id, patch: patchData, updatedRecord },
          { tenantId, userId },
        );
        await this.outboxService.addToOutbox(tx, event);
      }

      if (entity && dto.data) {
        await this.processGraphRelations(
          tx,
          tenantId,
          id,
          entity.id,
          entityFields,
          dataToSave,
        );
      }

      return updatedRecord;
    });
  }

  async remove(id: number) {
    const currentRecord = await this.findOne(id);
    const instances = await this.prisma.workflowInstance.findFirst({
      where: { recordId: id } as any,
    });
    if (instances) {
      throw new BadRequestException(
        'Không thể xóa bản ghi vì nó đang nằm trong một luồng quy trình chờ duyệt.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedRecord = await tx.record.delete({ where: { id } as any });
      const store = tenantContext.getStore();
      const tenantId = store?.tenantId || 0;

      const event = this.createDomainEvent(
        'record.deleted',
        { id: deletedRecord.id, oldData: currentRecord.data },
        { tenantId },
      );
      await this.outboxService.addToOutbox(tx, event);

      return deletedRecord;
    });
  }

  async getRecordRevisions(recordId: number) {
    return this.prisma.recordRevision.findMany({
      where: { recordId } as any,
      include: {
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLookupData(fieldId: number) {
    const field = await this.prisma.fieldRegistry.findFirst({
      where: { id: fieldId } as any,
    });
    if (!field)
      throw new NotFoundException('Không tìm thấy định nghĩa trường.');

    const config: any = field.config || {};
    const options: any = config.options || {};
    const lookupEntityId = options.lookupEntityId;
    const displayField = options.displayField || 'id';
    const filterConfig = options.filter || {};

    if (!lookupEntityId) {
      throw new BadRequestException(
        'Trường này chưa được cấu hình liên kết thực thể (lookupEntityId).',
      );
    }

    const tenantStore = tenantContext.getStore();
    const tenantId = tenantStore?.tenantId || null;

    let sqlQuery = `
      SELECT r.* 
      FROM records r
    `;

    if (filterConfig.activeWorkflowOnly) {
      sqlQuery += `
        INNER JOIN workflow_instances wi ON r.id = wi.record_id
        WHERE wi.status = 'IN_PROGRESS'
      `;
    } else {
      sqlQuery += ` WHERE 1=1 `;
    }

    sqlQuery += `
      AND r.entity_id = $1 
      AND (r.tenant_id = $2 OR (r.tenant_id IS NULL AND $2 IS NULL))
    `;

    const queryParams: any[] = [lookupEntityId, tenantId];
    let paramIndex = 3;

    if (filterConfig.recordFilters) {
      for (const [key, val] of Object.entries(filterConfig.recordFilters)) {
        sqlQuery += ` AND r.data->>${'$' + paramIndex} = ${'$' + (paramIndex + 1)}`;
        queryParams.push(key, String(val));
        paramIndex += 2;
      }
    }

    sqlQuery += ` ORDER BY r.id DESC`;

    const records = await this.prisma.$queryRawUnsafe<any[]>(
      sqlQuery,
      ...queryParams,
    );

    return records.map((r: any) => {
      const recordData = r.data as any;
      const codePrefix = r.business_code ? `[${r.business_code}] ` : '';

      let labelValue = recordData[displayField];
      if (!labelValue && displayField === 'id') {
        labelValue = r.title ? r.title : `#${r.id}`;
      }

      return {
        id: r.id,
        label: `${codePrefix}${labelValue}`,
      };
    });
  }
}
