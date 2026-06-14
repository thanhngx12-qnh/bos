// File: src/modules/records/records.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { DynamicValidationService } from './dynamic-validation.service'; // <-- KÍCH HOẠT ĐỘNG CƠ MỚI

@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dynamicValidator: DynamicValidationService, // <-- INJECT ĐỘNG CƠ VÀO ĐÂY
  ) {}

  async create(userId: number, dto: CreateRecordDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
      include: { fields: true },
    });

    if (!entity)
      throw new NotFoundException('Không tìm thấy Biểu mẫu (Entity).');

    // Gọi Động cơ Validate VIP PRO xử lý dữ liệu
    const cleanData = this.dynamicValidator.validateAndSanitize(
      entity.fields,
      dto.data,
    );

    return this.prisma.record.create({
      data: {
        entityId: dto.entityId,
        data: cleanData as any, // Tránh lỗi TypeScript JsonValue
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

      // Gọi Động cơ Validate VIP PRO
      dataToSave = this.dynamicValidator.validateAndSanitize(
        entity.fields,
        mergedData,
      );
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
