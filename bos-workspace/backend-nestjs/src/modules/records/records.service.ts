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

@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dynamicValidator: DynamicValidationService, // <-- INJECT ĐỘNG CƠ VALIDATE
    private readonly formulaEngine: FormulaEngineService, // <-- INJECT ĐỘNG CƠ CÔNG THỨC MỚI
  ) {}

  // --- THUẬT TOÁN BIÊN DỊCH MẪU TỰ SINH MÃ (AUTO-CODE GENERATOR) ---
  // Hỗ trợ tự động parse chuỗi cấu hình dạng: "PREFIX-{SEQ:X}-SUFFIX"
  private generateRecordCode(pattern: string, count: number): string {
    const regex = /\{SEQ:(\d+)\}/g;
    return pattern.replace(regex, (match, length) => {
      const padLength = parseInt(length, 10);
      return String(count).padStart(padLength, '0'); // Điền đầy các số 0 ở trước (padding)
    });
  }

  async create(userId: number, dto: CreateRecordDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
      include: { fields: true },
    });

    if (!entity)
      throw new NotFoundException('Không tìm thấy Biểu mẫu (Entity).');

    // Bước 1: Gọi Động cơ Validate VIP PRO xử lý và làm sạch dữ liệu
    const cleanData = this.dynamicValidator.validateAndSanitize(
      entity.fields,
      dto.data,
    );

    // Bước 2: Gọi Động cơ Công thức để tự động tính toán các trường FORMULA dựa trên cleanData
    const finalData = this.formulaEngine.calculate(entity.fields, cleanData);

    // Bước 3: Tự sinh mã nghiệp vụ (recordCode) dựa trên mẫu autoCodePattern của Biểu mẫu
    let recordCode: string | null = null;
    if (entity.autoCodePattern) {
      const recordCount = await this.prisma.record.count({
        where: { entityId: entity.id },
      });
      // Số thứ tự thực tế = Tổng số lượng bản ghi của biểu mẫu này + 1
      recordCode = this.generateRecordCode(
        entity.autoCodePattern,
        recordCount + 1,
      );
    }

    return this.prisma.record.create({
      data: {
        entityId: dto.entityId,
        recordCode, // Lưu mã tự sinh nghiệp vụ (Ví dụ: QTMS-0001)
        data: finalData as any, // Lưu dữ liệu đã được tính toán công thức chuẩn xác
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

  async update(id: number, dto: UpdateRecordDto) {
    const currentRecord = await this.findOne(id);

    const entity = await this.prisma.entity.findUnique({
      where: { id: currentRecord.entityId },
      include: { fields: true },
    });

    let dataToSave = currentRecord.data;

    if (entity && dto.data) {
      // Gộp data cũ và mới để validate lại toàn bộ
      const mergedData = { ...(currentRecord.data as object), ...dto.data };

      // Bước 1: Validate & Làm sạch dữ liệu gộp
      const cleanData = this.dynamicValidator.validateAndSanitize(
        entity.fields,
        mergedData,
      );

      // Bước 2: Tính toán lại các công thức dựa trên dữ liệu mới gộp sạch
      dataToSave = this.formulaEngine.calculate(entity.fields, cleanData);
    }

    return this.prisma.record.update({
      where: { id },
      data: {
        data: dataToSave as any, // Tránh lỗi TypeScript
      },
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
}
