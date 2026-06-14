// File: src/modules/print-templates/print-templates.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class PrintTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTemplateDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
    });
    if (!entity) throw new NotFoundException('Không tìm thấy Biểu mẫu.');

    return this.prisma.printTemplate.create({
      data: {
        entityId: dto.entityId,
        name: dto.name,
        template: dto.template || {},
      },
    });
  }

  async findOne(id: number) {
    const template = await this.prisma.printTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Không tìm thấy mẫu in.');
    return template;
  }

  async update(id: number, dto: UpdateTemplateDto) {
    await this.findOne(id); // Kiểm tra tồn tại
    return this.prisma.printTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        template: dto.template ?? undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.printTemplate.delete({ where: { id } });
  }

  // --- THUẬT TOÁN ĐỆ QUY INTERPOLATE (BIÊN DỊCH THẺ ĐỘNG) ---
  private interpolate(html: string, context: any): string {
    return html.replace(/\{\{\s*([\w.\[\]]+)\s*\}\}/g, (match, path) => {
      const cleanPath = path.replace(/\[(\d+)\]/g, '.$1');
      const keys = cleanPath.split('.');
      let value = context;

      for (const key of keys) {
        if (value && value[key] !== undefined) {
          value = value[key];
        } else {
          value = '';
          break;
        }
      }
      return String(value);
    });
  }

  // --- TRÍCH XUẤT DỮ LIỆU THỰC TẾ & BIÊN DỊCH THÀNH HTML HOÀN CHỈNH ---
  async renderTemplate(templateId: number, recordId: number) {
    const printTemplate = await this.findOne(templateId);

    const record = await this.prisma.record.findUnique({
      where: { id: recordId },
      include: { entity: true },
    });
    if (!record) throw new NotFoundException('Không tìm thấy bản ghi dữ liệu.');
    if (record.entityId !== printTemplate.entityId) {
      throw new BadRequestException(
        'Mẫu in không tương thích với biểu mẫu của bản ghi này.',
      );
    }

    const instance = await this.prisma.workflowInstance.findFirst({
      where: { recordId },
      orderBy: { id: 'desc' },
    });

    let approvals: any[] = [];
    if (instance) {
      const logs = await this.prisma.workflowLog.findMany({
        where: { instanceId: instance.id },
        include: {
          step: { select: { name: true } },
          user: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      approvals = logs.map((l) => {
        const snapshotObj: any = l.snapshot || {};
        // BỐ TRÍ CHỮ KÝ ĐIỆN TỬ: Tự động vẽ khung chữ ký nếu log phê duyệt có lưu signatureData
        const signatureHtml = snapshotObj.signature
          ? `<div style="border: 1px dashed green; color: green; padding: 5px; width: fit-content; font-size: 11px; margin-top: 5px; font-family: monospace; background-color: #f6fff6;">[KÝ ĐIỆN TỬ THÀNH CÔNG]<br/>Mã xác thực: ${snapshotObj.signature}<br/>Người ký: ${l.user?.fullName}</div>`
          : `<span style="color: blue;">(Đã duyệt qua hệ thống)</span>`;

        return {
          step: l.step?.name || 'Khởi tạo',
          user: l.user?.fullName || 'Hệ thống',
          action: l.action,
          comment: l.comment || '',
          signature: signatureHtml, // Trả về thẻ chữ ký động để render xuống HTML
          date: new Date(l.createdAt).toLocaleDateString('vi-VN'),
        };
      });
    }

    const context = {
      entity: {
        name: record.entity.name,
        code: record.entity.code,
      },
      record: {
        id: record.id,
        date: new Date(record.createdAt).toLocaleDateString('vi-VN'),
      },
      data: record.data,
      approvals: approvals, // Đóng gói mảng approvals chứa chữ ký điện tử
    };

    const templateObj = printTemplate.template as any;
    const rawHtml = templateObj.html || '';

    const compiledHtml = this.interpolate(rawHtml, context);

    return {
      templateName: printTemplate.name,
      renderedHtml: compiledHtml,
    };
  }
}
