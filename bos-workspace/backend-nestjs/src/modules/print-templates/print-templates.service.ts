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
      where: { id: dto.entityId } as any, // SỬA LỖI: as any
    });
    if (!entity) throw new NotFoundException('Không tìm thấy Biểu mẫu.');

    return this.prisma.printTemplate.create({
      data: {
        entityId: dto.entityId,
        name: dto.name,
        template: dto.template || {},
      } as any, // SỬA LỖI: as any
    });
  }

  async findOne(id: number) {
    const template = await this.prisma.printTemplate.findFirst({
      where: { id } as any, // SỬA LỖI: findFirst & as any
    });
    if (!template) throw new NotFoundException('Không tìm thấy mẫu in.');
    return template;
  }

  async update(id: number, dto: UpdateTemplateDto) {
    await this.findOne(id);
    return this.prisma.printTemplate.update({
      where: { id } as any, // SỬA LỖI: as any
      data: {
        name: dto.name,
        template: dto.template ?? undefined,
      } as any, // SỬA LỖI: as any
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.printTemplate.delete({ where: { id } as any }); // SỬA LỖI: as any
  }

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

  async renderTemplate(templateId: number, recordId: number) {
    const printTemplate = await this.findOne(templateId);

    const record = await this.prisma.record.findFirst({
      where: { id: recordId } as any, // SỬA LỖI: findFirst & as any
      include: { entity: true },
    });
    if (!record) throw new NotFoundException('Không tìm thấy bản ghi dữ liệu.');
    if (record.entityId !== printTemplate.entityId) {
      throw new BadRequestException(
        'Mẫu in không tương thích với biểu mẫu của bản ghi này.',
      );
    }

    const instance = await this.prisma.workflowInstance.findFirst({
      where: { recordId } as any, // SỬA LỖI: as any
      orderBy: { id: 'desc' },
    });

    let approvals: any[] = [];
    if (instance) {
      const logs = await this.prisma.workflowLog.findMany({
        where: { instanceId: instance.id } as any, // SỬA LỖI: as any
        include: {
          step: { select: { name: true } },
          user: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      approvals = logs.map((l) => {
        const snapshotObj: any = l.snapshot || {};
        const signatureHtml = snapshotObj.signature
          ? `<div style="border: 1px dashed green; color: green; padding: 5px; width: fit-content; font-size: 11px; margin-top: 5px; font-family: monospace; background-color: #f6fff6;">[KÝ ĐIỆN TỬ THÀNH CÔNG]<br/>Mã xác thực: ${snapshotObj.signature}<br/>Người ký: ${l.user?.fullName}</div>`
          : `<span style="color: blue;">(Đã duyệt qua hệ thống)</span>`;

        return {
          step: l.step?.name || 'Khởi tạo',
          user: l.user?.fullName || 'Hệ thống',
          action: l.action,
          comment: l.comment || '',
          signature: signatureHtml,
          date: new Date(l.createdAt).toLocaleDateString('vi-VN'),
        };
      });
    }

    // SỬA LỖI: Gọi businessCode thay vì recordCode
    const code = (record as any).businessCode;

    const context = {
      entity: {
        name: (record as any).entity.name,
        code: (record as any).entity.code,
      },
      record: {
        id: code ? code : `#${record.id}`,
        date: new Date(record.createdAt).toLocaleDateString('vi-VN'),
      },
      data: record.data,
      approvals: approvals,
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
