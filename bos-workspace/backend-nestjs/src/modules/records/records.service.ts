// File: src/modules/records/records.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- HÀM NỘI BỘ: LÀM SẠCH VÀ ÉP KIỂU DỮ LIỆU ---
  private validateAndSanitizeData(fields: any[], inputData: any) {
    const sanitizedData: Record<string, any> = {};

    for (const field of fields) {
      let value = inputData[field.code];

      // 1. Kiểm tra trường bắt buộc (isRequired)
      if (
        field.isRequired &&
        (value === undefined || value === null || value === '')
      ) {
        throw new BadRequestException(
          `Dữ liệu không hợp lệ: Trường '${field.name}' là bắt buộc nhập.`,
        );
      }

      // 2. Ép kiểu và Validate (Chỉ xử lý khi có giá trị)
      if (value !== undefined && value !== null && value !== '') {
        switch (field.type) {
          case 'NUMBER':
            const numVal = Number(value);
            if (isNaN(numVal)) {
              throw new BadRequestException(
                `Dữ liệu không hợp lệ: Trường '${field.name}' phải là định dạng số.`,
              );
            }
            sanitizedData[field.code] = numVal; // Lưu đúng kiểu số
            break;

          case 'TEXT':
            sanitizedData[field.code] = String(value); // Ép về chuỗi
            break;

          // Các kiểu phức tạp khác (SELECT, TABLE...) sẽ lưu nguyên bản JSON
          default:
            sanitizedData[field.code] = value;
        }
      }
    }

    // Kết quả trả về là một Object "sạch", chỉ chứa các key hợp lệ đã được ép kiểu
    return sanitizedData;
  }

  async create(userId: number, dto: CreateRecordDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
      include: { fields: true },
    });

    if (!entity)
      throw new NotFoundException('Không tìm thấy Biểu mẫu (Entity).');

    // Chạy qua màng lọc dữ liệu
    const cleanData = this.validateAndSanitizeData(entity.fields, dto.data);

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

      // Chạy qua màng lọc
      dataToSave = this.validateAndSanitizeData(entity.fields, mergedData);
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
