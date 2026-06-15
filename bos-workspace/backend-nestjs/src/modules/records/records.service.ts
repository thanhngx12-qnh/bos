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

  async create(userId: number, dto: CreateRecordDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
      include: { fields: true },
    });

    if (!entity)
      throw new NotFoundException('Không tìm thấy Biểu mẫu (Entity).');

    const cleanData = this.dynamicValidator.validateAndSanitize(
      entity.fields,
      dto.data,
    );

    const finalData = this.formulaEngine.calculate(entity.fields, cleanData);

    let recordCode: string | null = null;
    if (entity.autoCodePattern) {
      const recordCount = await this.prisma.record.count({
        where: { entityId: entity.id },
      });
      recordCode = this.generateRecordCode(
        entity.autoCodePattern,
        recordCount + 1,
      );
    }

    return this.prisma.record.create({
      data: {
        entityId: dto.entityId,
        recordCode,
        data: finalData as any,
        createdBy: userId,
      },
    });
  }

  // ====================================================
  // ĐỘNG CƠ TRUY VẤN VẠN NĂNG (UNIVERSAL QUERY ENGINE):
  // Phân trang, Tìm kiếm toàn văn bản JSONB, Sắp xếp động, Lọc động
  // ====================================================
  async findAllByEntity(
    entityId: number,
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
    searchQuery?: string,
    filtersRaw?: string,
  ) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      include: { fields: true },
    });
    if (!entity) throw new NotFoundException('Không tìm thấy Biểu mẫu.');

    const tenantStore = tenantContext.getStore();
    const tenantId = tenantStore?.tenantId || null;

    let filterSql = '';
    const queryParams: any[] = [entityId, tenantId];
    let paramIndex = 3;

    // 1. XỬ LÝ LỌC ĐỘNG NHIỀU TRƯỜNG (Multi-field Filtering)
    if (filtersRaw) {
      try {
        const filters = JSON.parse(filtersRaw);
        for (const [key, val] of Object.entries(filters)) {
          // BẢO VỆ TUYỆT ĐỐI SQL INJECTION: Chỉ cho phép lọc theo trường đã khai báo trong cấu hình Entity
          const fieldDef = entity.fields.find((f) => f.code === key);
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

    // 2. XỬ LÝ TÌM KIẾM TOÀN VĂN VẠN NĂNG (Global Search)
    const searchPattern = searchQuery ? `%${searchQuery}%` : '%';
    filterSql += ` AND r.data::text ILIKE ${'$' + paramIndex}`;
    queryParams.push(searchPattern);
    paramIndex += 1;

    // 3. XỬ LÝ SẮP XẾP ĐỘNG THÔNG MINH (Dynamic Sorting)
    let orderBySql = 'ORDER BY r.id DESC'; // Mặc định xếp theo id giảm dần
    if (sortBy) {
      const sortFieldDef = entity.fields.find((f) => f.code === sortBy);
      const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      if (sortFieldDef) {
        if (['NUMBER', 'FORMULA'].includes(sortFieldDef.type)) {
          // Ép kiểu sang số thực tế dưới Database để sắp xếp chuẩn xác
          orderBySql = `ORDER BY COALESCE((r.data->>'${sortBy}')::numeric, 0) ${direction}`;
        } else {
          orderBySql = `ORDER BY r.data->>'${sortBy}' ${direction}`;
        }
      }
    }

    // 4. PHÂN TRANG (Pagination offset)
    const offset = (page - 1) * limit;
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;
    queryParams.push(limit, offset);

    // 5. Cú pháp SQL thô hiệu năng cao chọc thẳng vào cấu trúc JSONB
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

    // 6. Thực thi truy vấn song song tối ưu hóa bằng Prisma Transaction
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
    const record = await this.prisma.record.findUnique({
      where: { id },
      include: {
        entity: { select: { id: true, name: true, code: true } },
      },
    });

    if (!record) throw new NotFoundException('Không tìm thấy bản ghi dữ liệu.');
    return record;
  }

  // --- HÀM UPDATE ---
  async update(userId: number, id: number, dto: UpdateRecordDto) {
    console.log('====================================');
    console.log('=== [DEBUG] bat dau recordsService.update ===');
    console.log('userId nhan duoc:', userId);
    console.log('recordId nhan duoc:', id);
    console.log('dto nhan duoc:', JSON.stringify(dto));

    const currentRecord = await this.findOne(id);
    console.log(
      'Du lieu record hien tai trong DB:',
      JSON.stringify(currentRecord.data),
    );

    const entity = await this.prisma.entity.findUnique({
      where: { id: currentRecord.entityId },
      include: { fields: true },
    });
    console.log('Tong so truong cua Entity:', entity?.fields?.length);

    let dataToSave = currentRecord.data;
    let patchData = {};

    if (entity && dto.data) {
      console.log('Phat hien dto.data hop le. Tien hanh gop du lieu...');
      const mergedData = { ...(currentRecord.data as object), ...dto.data };
      console.log(
        'Du lieu sau khi gop (mergedData):',
        JSON.stringify(mergedData),
      );

      // Bước 1: Validate & Làm sạch dữ liệu gộp
      const cleanData = this.dynamicValidator.validateAndSanitize(
        entity.fields,
        mergedData,
      );
      console.log(
        'Du lieu sau khi validate/sanitize (cleanData):',
        JSON.stringify(cleanData),
      );

      // Bước 2: Tính toán lại các công thức
      dataToSave = this.formulaEngine.calculate(entity.fields, cleanData);
      console.log(
        'Du lieu sau khi chay qua Formula Engine (dataToSave):',
        JSON.stringify(dataToSave),
      );

      // Bước 3: Tính toán Bản vá (Diff)
      patchData = this.calculateDiff(currentRecord.data, dataToSave);
      console.log(
        'Ban va tinh ra duoc (patchData):',
        JSON.stringify(patchData),
      );
    } else {
      console.log(
        'Bo qua khoi update vi entity hoac dto.data bi rong. dto.data =',
        dto.data,
      );
    }

    if (Object.keys(patchData).length === 0) {
      console.log(
        'Khong co thay doi du lieu thuc te -> Thoat som, tra ve ban ghi cu.',
      );
      return currentRecord;
    }

    console.log('Bat dau chay Prisma $transaction de ghi xuong DB...');
    return this.prisma.$transaction(async (tx) => {
      const updatedRecord = await tx.record.update({
        where: { id },
        data: {
          data: dataToSave as any,
        },
      });

      // Tạo lịch sử sửa (Revision)
      await tx.recordRevision.create({
        data: {
          recordId: id,
          userId: userId,
          patchData: patchData as any,
        },
      });

      console.log('=== GHI DB THANH CONG! ===');
      return updatedRecord;
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    const instances = await this.prisma.workflowInstance.findFirst({
      where: { recordId: id },
    });
    if (instances) {
      throw new BadRequestException(
        'Không thể xóa bản ghi vì nó đang nằm trong một luồng quy trình chờ duyệt.',
      );
    }
    return this.prisma.record.delete({ where: { id } });
  }

  // Lấy lịch sử chỉnh sửa
  async getRecordRevisions(recordId: number) {
    return this.prisma.recordRevision.findMany({
      where: { recordId },
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
    const field = await this.prisma.fieldDefinition.findUnique({
      where: { id: fieldId },
    });
    if (!field)
      throw new NotFoundException('Không tìm thấy định nghĩa trường.');

    const options: any = field.options || {};
    const lookupEntityId = options.lookupEntityId;
    const displayField = options.displayField || 'id';
    const filterConfig = options.filter || {};

    if (!lookupEntityId) {
      throw new BadRequestException(
        'Trường này chưa được cấu hình liên kết thực thể (lookupEntityId).',
      );
    }

    const queryConditions: any = {
      entityId: lookupEntityId,
    };

    if (filterConfig.activeWorkflowOnly) {
      queryConditions.instances = {
        some: {
          status: 'IN_PROGRESS',
        },
      };
    }

    const records = await this.prisma.record.findMany({
      where: queryConditions,
      orderBy: { id: 'desc' },
    });

    let filteredRecords = records;
    if (filterConfig.recordFilters) {
      filteredRecords = records.filter((r) => {
        const recordData = r.data as any;
        return Object.entries(filterConfig.recordFilters).every(
          ([key, val]) => recordData[key] === val,
        );
      });
    }

    return filteredRecords.map((r) => {
      const recordData = r.data as any;
      const codePrefix = r.recordCode ? `[${r.recordCode}] ` : '';
      const labelValue = recordData[displayField] || `#${r.id}`;

      return {
        id: r.id,
        label: `${codePrefix}${labelValue}`,
      };
    });
  }
}
