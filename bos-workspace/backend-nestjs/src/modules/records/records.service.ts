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
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const yy = yyyy.slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    let code = pattern;

    // Replace date placeholders
    code = code.replace(/\{YYYY\}/gi, yyyy);
    code = code.replace(/\{YY\}/gi, yy);
    code = code.replace(/\{MM\}/gi, mm);
    code = code.replace(/\{DD\}/gi, dd);

    // Replace {SEQ:N} placeholder
    code = code.replace(/\{SEQ:(\d+)\}/g, (match, length) => {
      const padLength = parseInt(length, 10);
      return String(count).padStart(padLength, '0');
    });

    // Replace {NNNN...} sequence placeholder (case-insensitive for N)
    code = code.replace(/\{(N+)\}/gi, (match, nGroup) => {
      const padLength = nGroup.length;
      return String(count).padStart(padLength, '0');
    });

    // Auto-append sequence if no sequence placeholder exists in the pattern
    const hasExplicitSequence = /\{SEQ:\d+\}/i.test(pattern) || /\{N+\}/i.test(pattern);
    if (!hasExplicitSequence) {
      const separator = (code.endsWith('-') || code.endsWith('/') || code.endsWith('_')) ? '' : '-';
      code = code + separator + String(count).padStart(4, '0');
    }

    return code;
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
      orderBy: { version: 'desc' } as any,
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
    let tenantId = store?.tenantId;

    if (!tenantId) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId } as any,
      });
      tenantId = user?.tenantId || 0;
    }

    const entity = await this.prisma.entity.findFirst({
      where: { id: dto.entityId } as any,
    });

    if (!entity)
      throw new NotFoundException('Không tìm thấy Biểu mẫu (Entity).');

    const fields = await this.prisma.fieldRegistry.findMany({
      where: { tenantId } as any,
    });
    const entityFields = fields.filter(
      (f) => (f.config as any)?.entityId === entity.id,
    );

    const activeInstance = await this.prisma.entityVersion.findFirst({
      where: { entityId: entity.id, tenantId } as any,
    });

    // 1. Validate và tính toán công thức dữ liệu động
    const cleanData = this.dynamicValidator.validateAndSanitize(
      entityFields as any,
      dto.data,
    );

    const finalData = this.formulaEngine.calculate(entityFields as any, cleanData);

    // Bổ sung: Ràng buộc dữ liệu liên bảng chéo thực thể (Cross-Table Validation)
    await this.validateCrossTable(tenantId, entityFields, finalData);

    // 2. Chạy transaction nguyên tử
    return this.prisma.$transaction(async (tx) => {
      let recordCode: string | null = null;

      // === BẢN VÁ: SINH MÃ SỐ ĐA THUÊ BAO AN TOÀN NGUYÊN TỬ (ANTI-RACE CONDITION) === [1]
      if (entity.autoCodePattern) {
        const counter = await tx.sequenceCounter.upsert({
          where: {
            tenantId_code: {
              tenantId,
              code: entity.code,
            },
          } as any,
          update: {
            lastVal: { increment: 1 }, // Tăng tự động an toàn ở mức Database Engine
          },
          create: {
            tenantId,
            code: entity.code,
            lastVal: 1,
          },
        });

        recordCode = this.generateRecordCode(
          entity.autoCodePattern,
          counter.lastVal,
        );
      }

      const businessCode = recordCode || `CODE-${Date.now()}`;
      const generatedTitle = this.generateRecordTitle(
        (entity as any).titlePattern,
        finalData,
        businessCode,
      ) || dto.title || businessCode;

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
        entityFields as any,
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

    let dataScope = policy ? policy.dataScope : 'OWNED';
    if (currentUser.userType === 'SUPER_ADMIN') {
      dataScope = 'ALL';
    }
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

    // BẢN VÁ: ĐỒNG BỘ ĐỊNH DẠNG SNAKE_CASE TỪ RAW SQL SANG CAMELCASE CỦA PRISMA (ĐỂ TRÁNH LỖI FRONTEND DRAWERS)
    const mappedRecords = records.map((r) => ({
      ...r,
      entityId: r.entity_id,
      tenantId: r.tenant_id,
      metadataVersionId: r.metadata_version_id,
      businessCode: r.business_code,
      createdById: r.created_by_id,
      departmentId: r.department_id,
      deletedAt: r.deleted_at,
      deletedById: r.deleted_by_id,
      schemaHash: r.schema_hash,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      currentStepId: r.current_step_id,
    }));

    return {
      data: mappedRecords,
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
    const currentRecord = await this.findOne(id);
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId || currentRecord?.tenantId || 0;

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

      // Bổ sung: Ràng buộc dữ liệu liên bảng chéo thực thể (Cross-Table Validation)
      await this.validateCrossTable(tenantId, entityFields, dataToSave, id);

      patchData = this.calculateDiff(currentRecord.data, dataToSave);
      isDataChanged = Object.keys(patchData).length > 0;
    }

    let isTitleChanged = false;
    if (entity) {
      const titlePatternVal = (entity as any).titlePattern;
      const calcTitle = this.generateRecordTitle(
        titlePatternVal,
        dataToSave as any,
        (currentRecord as any).businessCode,
      );
      if (titlePatternVal && calcTitle) {
        newTitle = calcTitle;
      } else if (dto.title !== undefined) {
        newTitle = dto.title;
      }
      if (!newTitle) {
        newTitle = (currentRecord as any).businessCode;
      }
      if (newTitle !== (currentRecord as any).title) {
        isTitleChanged = true;
      }
    }

    const shouldUpdate = isDataChanged || isTitleChanged;

    return this.prisma.$transaction(async (tx) => {
      let updatedRecord: any = currentRecord;

      if (shouldUpdate) {
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

  async remove(id: number, userType?: string) {
    const currentRecord = await this.findOne(id);
    const activeInstance = await this.prisma.workflowInstance.findFirst({
      where: { recordId: id, status: 'IN_PROGRESS' } as any,
    });
    if (activeInstance && userType !== 'SUPER_ADMIN') {
      throw new BadRequestException(
        'Không thể xóa bản ghi vì nó đang trong một luồng quy trình đang chạy.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (activeInstance && userType === 'SUPER_ADMIN') {
        await tx.task.deleteMany({ where: { instanceId: activeInstance.id } as any });
        await tx.workflowLog.deleteMany({ where: { instanceId: activeInstance.id } as any });
        await tx.workflowParticipant.deleteMany({ where: { instanceId: activeInstance.id } as any });
        await tx.workflowInstance.delete({ where: { id: activeInstance.id } as any });
      }

      const deletedRecord = await tx.record.delete({ where: { id } as any });
      const store = tenantContext.getStore();
      const tenantId = store?.tenantId || currentRecord?.tenantId || 0;

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

    const needsWorkflowJoin = filterConfig.activeWorkflowOnly || (filterConfig.currentStepId !== undefined && filterConfig.currentStepId !== null);
    if (needsWorkflowJoin) {
      sqlQuery += `
        INNER JOIN workflow_instances wi ON r.id = wi.record_id
      `;
    }

    sqlQuery += ` WHERE 1=1 `;

    if (filterConfig.activeWorkflowOnly) {
      sqlQuery += ` AND wi.status = 'IN_PROGRESS' `;
    }

    sqlQuery += `
      AND r.entity_id = $1 
      AND (r.tenant_id = $2 OR (r.tenant_id IS NULL AND $2 IS NULL))
    `;

    const queryParams: any[] = [lookupEntityId, tenantId];
    let paramIndex = 3;

    if (filterConfig.currentStepId !== undefined && filterConfig.currentStepId !== null) {
      sqlQuery += ` AND wi.current_step_id = $${paramIndex}`;
      queryParams.push(Number(filterConfig.currentStepId));
      paramIndex += 1;
    }

    if (filterConfig.status) {
      if (Array.isArray(filterConfig.status)) {
        if (filterConfig.status.length > 0) {
          const placeholders = filterConfig.status.map((_, i) => `$${paramIndex + i}`).join(', ');
          sqlQuery += ` AND r.status IN (${placeholders})`;
          queryParams.push(...filterConfig.status);
          paramIndex += filterConfig.status.length;
        }
      } else if (typeof filterConfig.status === 'string' && filterConfig.status) {
        sqlQuery += ` AND r.status = $${paramIndex}`;
        queryParams.push(filterConfig.status);
        paramIndex += 1;
      }
    }

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

      let labelValue = '';
      if (Array.isArray(displayField)) {
        labelValue = displayField
          .map((f) => recordData[f] || '')
          .filter(Boolean)
          .join(' - ');
      } else if (typeof displayField === 'string' && displayField.includes(',')) {
        labelValue = displayField
          .split(',')
          .map((f) => f.trim())
          .map((f) => recordData[f] || '')
          .filter(Boolean)
          .join(' - ');
      } else if (displayField) {
        labelValue = recordData[displayField];
      }

      if (!labelValue) {
        labelValue = r.title ? r.title : `#${r.id}`;
      }

      return {
        id: r.id,
        label: `${codePrefix}${labelValue}`,
      };
    });
  }

  async lookupLastTrip(tenantId: number, licensePlate: string) {
    if (!licensePlate) {
      throw new BadRequestException('Biển số xe không được để trống.');
    }
    const cleanPlate = licensePlate.trim();
    const query = `
      SELECT id, business_code as "businessCode", data 
      FROM records 
      WHERE tenant_id = $1 
        AND deleted_at IS NULL 
        AND (
          LOWER(data->>'BIEN_SO_XE') = LOWER($2)
          OR LOWER(data->>'bien_so_xe') = LOWER($2)
        )
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const results = await this.prisma.$queryRawUnsafe<any[]>(
      query,
      tenantId,
      cleanPlate,
    );

    if (results.length === 0) {
      return { found: false };
    }

    const record = results[0];
    return {
      found: true,
      recordId: record.id,
      businessCode: record.businessCode,
      data: record.data,
    };
  }

  async getPowerPlugReport(tenantId: number, dateStr?: string) {
    const sqlQuery = `
      SELECT id, business_code as "businessCode", data, created_at as "createdAt"
      FROM records
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND (
          data->>'SO_CONTAINER' IS NOT NULL 
          OR data->>'so_container' IS NOT NULL
        )
      ORDER BY created_at DESC
    `;
    const results = await this.prisma.$queryRawUnsafe<any[]>(sqlQuery, tenantId);

    const reportData = results.map((r) => {
      const d = r.data as any;
      const bienSo = d.BIEN_SO_XE || d.bien_so_xe || d.BIEN_SO || '';
      const soCont = d.SO_CONTAINER || d.so_container || '';
      const chuHang = d.CHU_HANG || d.chu_hang || '';
      const loaiHinh = d.LOAI_HINH || d.loai_hinh || '';
      const thoiGianCam = d.THOI_GIAN_CAM || d.thoi_gian_cam || '';
      const thoiGianRut = d.THOI_GIAN_RUT || d.thoi_gian_rut || '';

      let durationHours = 0;
      if (thoiGianCam) {
        const camTime = new Date(thoiGianCam).getTime();
        const rutTime = thoiGianRut ? new Date(thoiGianRut).getTime() : Date.now();
        if (!isNaN(camTime) && !isNaN(rutTime) && rutTime > camTime) {
          durationHours = parseFloat(((rutTime - camTime) / 3600000).toFixed(2));
        }
      }

      return {
        id: r.id,
        businessCode: r.businessCode,
        bienSo,
        soCont,
        chuHang,
        loaiHinh,
        thoiGianCam,
        thoiGianRut,
        durationHours,
        status: thoiGianRut ? 'Đã rút' : 'Đang cắm',
      };
    });

    if (dateStr) {
      const filterDate = dateStr.trim();
      return reportData.filter((row) => {
        const rowDate = row.thoiGianCam ? row.thoiGianCam.substring(0, 10) : '';
        return rowDate === filterDate;
      });
    }

    return reportData;
  }

  private async validateCrossTable(
    tenantId: number,
    entityFields: any[],
    data: any,
    recordId?: number,
  ): Promise<void> {
    for (const field of entityFields) {
      const config: any = field.config || {};
      const options: any = config.options || {};
      const validation = options.crossTableValidation;
      if (!validation) continue;

      const {
        lookupFieldCode,
        targetSumFieldCode,
        actualSumFieldCode,
        errorMessage,
      } = validation;

      if (!lookupFieldCode || !targetSumFieldCode || !actualSumFieldCode) continue;

      const lookupId = Number(data[lookupFieldCode]);
      if (!lookupId || isNaN(lookupId)) continue;

      const planRecord = await this.prisma.record.findFirst({
        where: { id: lookupId, tenantId, deletedAt: null },
      });
      if (!planRecord) continue;

      const planData = planRecord.data as any;
      const planLimit = Number(planData[targetSumFieldCode]) || 0;

      const otherRecords = await this.prisma.record.findMany({
        where: {
          entityId: config.entityId,
          tenantId,
          deletedAt: null,
          id: recordId ? { not: recordId } : undefined,
        },
      });

      let currentSum = 0;
      for (const r of otherRecords) {
        const rData = r.data as any;
        if (Number(rData[lookupFieldCode]) === lookupId) {
          currentSum += Number(rData[actualSumFieldCode]) || 0;
        }
      }

      const newActualValue = Number(data[actualSumFieldCode]) || 0;
      const totalActual = currentSum + newActualValue;

      if (totalActual > planLimit) {
        throw new BadRequestException(
          errorMessage ||
            `Lỗi ràng buộc: Tổng lượng thực tế (${totalActual}) vượt quá định mức kế hoạch (${planLimit}).`,
        );
      }
    }
  }
}
