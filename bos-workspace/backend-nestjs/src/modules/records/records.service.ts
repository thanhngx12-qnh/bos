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

  async findAllByEntity(entityId: number) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
    });
    if (!entity) throw new NotFoundException('Không tìm thấy Biểu mẫu.');

    return this.prisma.record.findMany({
      where: { entityId },
      orderBy: { id: 'desc' },
    });
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

  // --- HÀM NÂNG CẤP KÈM LOG CHẨN ĐOÁN CHI TIẾT ---
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
    // 1. Tìm định nghĩa trường dữ liệu (FieldDefinition)
    const field = await this.prisma.fieldDefinition.findUnique({
      where: { id: fieldId },
    });
    if (!field)
      throw new NotFoundException('Không tìm thấy định nghĩa trường.');

    const options: any = field.options || {};
    const lookupEntityId = options.lookupEntityId;
    const displayField = options.displayField || 'id'; // Mặc định hiển thị ID nếu không cấu hình displayField
    const filterConfig = options.filter || {};

    if (!lookupEntityId) {
      throw new BadRequestException(
        'Trường này chưa được cấu hình liên kết thực thể (lookupEntityId).',
      );
    }

    // 2. Xây dựng điều kiện truy vấn dưới Database
    const queryConditions: any = {
      entityId: lookupEntityId,
    };

    // Chỉ lọc các bản ghi đang chạy quy trình (Ví dụ: xe đang ở trong bãi)
    if (filterConfig.activeWorkflowOnly) {
      queryConditions.instances = {
        some: {
          status: 'IN_PROGRESS',
        },
      };
    }

    // Thực thi truy vấn (Prisma Client Extension sẽ tự động chèn thêm điều kiện cô lập tenantId!)
    const records = await this.prisma.record.findMany({
      where: queryConditions,
      orderBy: { id: 'desc' },
    });

    // 3. Thực hiện lọc mềm (In-Memory Filter) nếu có cấu hình lọc theo dữ liệu bản ghi
    let filteredRecords = records;
    if (filterConfig.recordFilters) {
      filteredRecords = records.filter((r) => {
        const recordData = r.data as any;
        return Object.entries(filterConfig.recordFilters).every(
          ([key, val]) => recordData[key] === val,
        );
      });
    }

    // 4. Map kết quả trả về dạng danh sách nhãn [{ id, label }] cho Frontend dễ vẽ Dropdown
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
