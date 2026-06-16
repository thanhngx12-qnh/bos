// File: src/modules/records/records.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { DynamicValidationService } from './dynamic-validation.service'; // <-- KÍCH HOẠT ĐỘNG CƠ VALIDATE MỚI
import { FormulaEngineService } from './formula-engine.service'; // <-- KÍCH HOẠT ĐỘNG CƠ CÔNG THỨC MỚI
import { tenantContext } from '../../prisma/tenant-context'; // <-- IMPORT CONTEXT ĐỂ QUẢN TRỊ SAAS

@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dynamicValidator: DynamicValidationService, // <-- INJECT ĐỘNG CƠ VALIDATE
    private readonly formulaEngine: FormulaEngineService, // <-- INJECT ĐỘNG CƠ CÔNG THỨC MỚI
  ) {}

  // --- THUẬT TOÁN BIÊN DỊCH MẪU TỰ SINH MÃ (AUTO-CODE GENERATOR) ---
  private generateRecordCode(pattern: string, count: number): string {
    const regex = /\{SEQ:(\d+)\}/g;
    return pattern.replace(regex, (match, length) => {
      const padLength = parseInt(length, 10);
      return String(count).padStart(padLength, '0');
    });
  }

  // --- THUẬT TOÁN BIÊN DỊCH TIÊU ĐỀ BẢN GHI (DYNAMIC TITLE GENERATOR) ---
  private generateRecordTitle(
    pattern: string | null | undefined,
    data: Record<string, any>,
    recordCode: string | null,
  ): string | null {
    if (!pattern) return null;

    // Tự động tìm các chuỗi nằm trong ngoặc nhọn {field_code} và thay bằng data
    return pattern.replace(/\{([^}]+)\}/g, (match, fieldCode) => {
      if (fieldCode === 'RECORD_CODE') return recordCode || '';
      const value = data[fieldCode];
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  // --- THUẬT TOÁN JSON DIFF (TÌM SỰ KHÁC BIỆT DỮ LIỆU) ---
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

  // --- HÀM TRỢ GIÚP: ĐẢM BẢO ENTITY VERSION TỒN TẠI ĐỂ GẮN VÀO RECORD ---
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

    // NÂNG CẤP DYNAMIC TITLE
    const businessCode = recordCode || `CODE-${Date.now()}`;
    const generatedTitle = this.generateRecordTitle(
      (entity as any).titlePattern,
      finalData,
      businessCode,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Đảm bảo EntityVersion tồn tại để tránh lỗi Foreign Key
      const validVersionId = await this.ensureEntityVersionExists(
        tx,
        tenantId,
        entity.id,
      );

      // 2. Tạo Bản ghi
      const newRecord = await tx.record.create({
        data: {
          entityId: dto.entityId,
          businessCode: businessCode,
          title: generatedTitle, // GHI TIÊU ĐỀ TỰ ĐỘNG XUỐNG DB
          data: finalData as any,
          createdById: userId,
          metadataVersionId: validVersionId,
        } as any,
      });

      // 3. Vẽ liên kết (Edges)
      await this.processGraphRelations(
        tx,
        tenantId,
        newRecord.id,
        entity.id,
        entityFields,
        finalData,
      );

      return newRecord;
    });
  }

  async findAllByEntity(
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

    let filterSql = '';
    const queryParams: any[] = [entityId, tenantId];
    let paramIndex = 3;

    if (filtersRaw) {
      try {
        const filters = JSON.parse(filtersRaw);
        for (const [key, val] of Object.entries(filters)) {
          const fieldDef = entityFields.find((f) => f.code === key);
          if (fieldDef) {
            filterSql += ` AND r.data->>${'$' + paramIndex} = ${'$' + (paramIndex + 1)}`;
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

    const searchPattern = searchQuery ? `%${searchQuery}%` : '%';
    // Mở rộng tìm kiếm toàn văn sang cả cột Title mới
    filterSql += ` AND (r.data::text ILIKE ${'$' + paramIndex} OR r.title ILIKE ${'$' + paramIndex})`;
    queryParams.push(searchPattern);
    paramIndex += 1;

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
      WHERE r.entity_id = $1 
        AND (r.tenant_id = $2 OR (r.tenant_id IS NULL AND $2 IS NULL))
        ${filterSql}
      ${orderBySql}
      LIMIT ${'$' + limitParamIndex} OFFSET ${'$' + offsetParamIndex}
    `;

    const sqlCountQuery = `
      SELECT COUNT(*)::int as count
      FROM records r
      WHERE r.entity_id = $1 
        AND (r.tenant_id = $2 OR (r.tenant_id IS NULL AND $2 IS NULL))
        ${filterSql}
    `;

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

      // NÂNG CẤP DYNAMIC TITLE (Chạy lại mỗi khi update dữ liệu)
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
            title: newTitle, // CẬP NHẬT TIÊU ĐỀ NẾU DỮ LIỆU ĐỔI
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
    await this.findOne(id);
    const instances = await this.prisma.workflowInstance.findFirst({
      where: { recordId: id } as any,
    });
    if (instances) {
      throw new BadRequestException(
        'Không thể xóa bản ghi vì nó đang nằm trong một luồng quy trình chờ duyệt.',
      );
    }
    return this.prisma.record.delete({ where: { id } as any });
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

  // ==========================================
  // ĐỘNG CƠ TRA CỨU LIÊN KẾT ĐỘNG (LOOKUP ENGINE)
  // ==========================================
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

      // Ưu tiên hiển thị cột title nếu displayField không được định nghĩa cứng
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
