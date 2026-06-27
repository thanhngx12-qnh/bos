// File: src/modules/print-templates/print-templates.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { AttachmentsService } from '../attachments/attachments.service';

@Injectable()
export class PrintTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachmentsService: AttachmentsService,
  ) {}

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

  async findAll(entityId?: number) {
    const where: any = {};
    if (entityId) {
      where.entityId = Number(entityId);
    }
    return this.prisma.printTemplate.findMany({
      where,
      orderBy: { id: 'desc' },
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

  private formatDate(val: any): string {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return String(val);
    }
  }

  private formatDateTime(val: any): string {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return String(val);
    }
  }

  private formatTime(val: any): string {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      return String(val);
    } catch {
      return String(val);
    }
  }

  private formatMonthYear(val: any): string {
    if (!val) return '';
    try {
      if (typeof val === 'string' && val.includes('-') && val.split('-').length === 2) {
        const [y, m] = val.split('-');
        return `${m}/${y}`;
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${month}/${year}`;
    } catch {
      return String(val);
    }
  }

  private formatNumber(val: any, type: string, configOptions: any = {}): string {
    if (val === undefined || val === null || val === '') return '';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    
    const options = configOptions || {};
    if (type === 'CURRENCY') {
      const prefix = options.prefix || 'VNĐ';
      const formatted = num.toLocaleString('en-US');
      return `${formatted} ${prefix}`;
    }
    if (type === 'PERCENTAGE') {
      return `${num}%`;
    }
    if (type === 'DECIMAL') {
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toLocaleString('en-US');
  }

  private async formatFileField(val: any): Promise<string> {
    if (!val) return '';
    const files = Array.isArray(val) ? val : [val];
    const fileLinks: string[] = [];
    for (const f of files) {
      if (!f || typeof f !== 'object') continue;
      let url = f.url || '';
      if (f.id) {
        try {
          const details = await this.attachmentsService.getPresignedUrl(Number(f.id));
          url = details.presignedUrl;
        } catch (err) {
          // Keep default url
        }
      }
      const name = f.name || f.fileName || 'Tệp đính kèm';
      if (url) {
        fileLinks.push(`<a href="${url}" target="_blank" style="color: #1890ff; text-decoration: underline; font-weight: 500;">📎 ${name}</a>`);
      } else {
        fileLinks.push(`📎 ${name}`);
      }
    }
    return fileLinks.join(', ');
  }

  private async formatImageField(val: any): Promise<string> {
    if (!val) return '';
    const files = Array.isArray(val) ? val : [val];
    const imageHtmls: string[] = [];
    for (const f of files) {
      if (!f || typeof f !== 'object') continue;
      let url = f.url || '';
      if (f.id) {
        try {
          const details = await this.attachmentsService.getPresignedUrl(Number(f.id));
          url = details.presignedUrl;
        } catch (err) {
          // Keep default url
        }
      }
      const name = f.name || f.fileName || 'Ảnh minh chứng';
      if (url) {
        imageHtmls.push(`<img src="${url}" alt="${name}" style="max-width: 150px; max-height: 150px; border-radius: 4px; object-fit: cover; border: 1px solid #d9d9d9; margin-right: 8px; vertical-align: middle;" />`);
      } else {
        imageHtmls.push(`[Ảnh: ${name}]`);
      }
    }
    return imageHtmls.join(' ');
  }

  private formatRef(val: any, map: Map<number, string>): string {
    if (val === undefined || val === null || val === '') return '';
    const ids = Array.isArray(val) ? val : [val];
    return ids.map(id => {
      const numId = Number(id);
      return map.get(numId) || String(id);
    }).filter(Boolean).join(', ');
  }

  private renderTableToHtml(field: any, value: any[]): string {
    const columns = field.config?.options?.columns || [];
    const rows = value || [];

    if (!columns || columns.length === 0) return '';

    let html = `<table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-family: inherit; font-size: 13px;">`;
    
    // 1. Header
    html += `<thead><tr style="background-color: #fafafa; border-bottom: 2px solid #f0f0f0;">`;
    columns.forEach((col: any) => {
      const thStyle = `border: 1px solid #f0f0f0; text-align: left; padding: 8px; font-weight: 600; color: rgba(0, 0, 0, 0.85);`;
      html += `<th style="${thStyle}">${col.name || ''}</th>`;
    });
    html += `</tr></thead>`;

    // 2. Body
    html += `<tbody>`;
    rows.forEach((row: any, rowIdx: number) => {
      html += `<tr style="border-bottom: 1px solid #f0f0f0;">`;
      columns.forEach((col: any) => {
        let cellVal = '';
        if (col.type === 'STT') {
          cellVal = String(rowIdx + 1);
        } else {
          const rawVal = row[col.code];
          if (col.type === 'CHECKBOX') {
            cellVal = rawVal === true || rawVal === 'true' ? '☑' : '☐';
          } else if (col.type === 'NUMBER' || col.type === 'DECIMAL' || col.type === 'CURRENCY' || col.type === 'PERCENTAGE') {
            cellVal = this.formatNumber(rawVal, col.type, col.options || {});
          } else {
            cellVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
          }
        }
        html += `<td style="border: 1px solid #f0f0f0; padding: 8px; color: rgba(0, 0, 0, 0.65);">${cellVal}</td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody>`;

    // 3. Footer (Summary)
    const hasSummary = columns.some((col: any) => col.summaryType && col.summaryType !== 'NONE');
    if (hasSummary && rows.length > 0) {
      html += `<tfoot><tr style="font-weight: bold; background-color: #fafafa; border-top: 2px solid #f0f0f0;">`;
      columns.forEach((col: any, colIdx: number) => {
        let summaryText = '';
        if (colIdx === 0) {
          summaryText = 'Tổng cộng';
        }

        if (col.summaryType === 'SUM') {
          const sum = rows.reduce((acc, r) => {
            const val = Number(r[col.code]);
            return acc + (isNaN(val) ? 0 : val);
          }, 0);
          summaryText = this.formatNumber(sum, col.type, col.options || {});
        } else if (col.summaryType === 'AVG') {
          const sum = rows.reduce((acc, r) => {
            const val = Number(r[col.code]);
            return acc + (isNaN(val) ? 0 : val);
          }, 0);
          const avg = rows.length > 0 ? sum / rows.length : 0;
          summaryText = this.formatNumber(avg, col.type, col.options || {});
        }

        html += `<td style="border: 1px solid #f0f0f0; padding: 8px; color: rgba(0, 0, 0, 0.85);">${summaryText}</td>`;
      });
      html += `</tr></tfoot>`;
    }

    html += `</table>`;
    return html;
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

    // Fetch fields snapshot/definitions for this entity
    const fields = await this.prisma.fieldRegistry.findMany({
      where: {
        config: {
          path: ['entityId'],
          equals: record.entityId,
        },
      } as any,
    });

    const tenantId = record.tenantId;
    let userMap = new Map<number, string>();
    let deptMap = new Map<number, string>();
    let roleMap = new Map<number, string>();

    if (tenantId) {
      const [users, departments, roles] = await Promise.all([
        this.prisma.user.findMany({
          where: { tenantId } as any,
          select: { id: true, fullName: true, email: true },
        }),
        this.prisma.department.findMany({
          where: { tenantId } as any,
          select: { id: true, name: true },
        }),
        this.prisma.role.findMany({
          where: { tenantId } as any,
          select: { id: true, name: true },
        }),
      ]);

      userMap = new Map(users.map((u) => [u.id, `${u.fullName} (${u.email})`]));
      deptMap = new Map(departments.map((d) => [d.id, d.name]));
      roleMap = new Map(roles.map((r) => [r.id, r.name]));
    }

    const formattedData: Record<string, any> = {};
    const rawData = (record.data || {}) as Record<string, any>;

    for (const f of fields) {
      const val = rawData[f.code];
      if (val === undefined || val === null) {
        formattedData[f.code] = '';
        continue;
      }

      if (f.type === 'DATE') {
        formattedData[f.code] = this.formatDate(val);
      } else if (f.type === 'DATETIME') {
        formattedData[f.code] = this.formatDateTime(val);
      } else if (f.type === 'TIME') {
        formattedData[f.code] = this.formatTime(val);
      } else if (f.type === 'MONTH_YEAR') {
        formattedData[f.code] = this.formatMonthYear(val);
      } else if (f.type === 'CHECKBOX') {
        formattedData[f.code] =
          val === true || val === 'true' ? '☑ Có' : '☐ Không';
      } else if (
        f.type === 'NUMBER' ||
        f.type === 'DECIMAL' ||
        f.type === 'CURRENCY' ||
        f.type === 'PERCENTAGE'
      ) {
        formattedData[f.code] = this.formatNumber(
          val,
          f.type,
          (f.config as any)?.options || {},
        );
      } else if (f.type === 'FILE') {
        formattedData[f.code] = await this.formatFileField(val);
      } else if (f.type === 'IMAGE') {
        formattedData[f.code] = await this.formatImageField(val);
      } else if (f.type === 'USER_REF') {
        formattedData[f.code] = this.formatRef(val, userMap);
      } else if (f.type === 'DEPT_REF') {
        formattedData[f.code] = this.formatRef(val, deptMap);
      } else if (f.type === 'ROLE_REF') {
        formattedData[f.code] = this.formatRef(val, roleMap);
      } else if (f.type === 'TABLE') {
        formattedData[f.code] = this.renderTableToHtml(f, val);
      } else if (f.type === 'MULTI_SELECT') {
        formattedData[f.code] = Array.isArray(val) ? val.join(', ') : String(val);
      } else {
        formattedData[f.code] = String(val);
      }
    }

    // copy any remaining attributes in rawData that are not registered
    for (const [key, val] of Object.entries(rawData)) {
      if (formattedData[key] === undefined) {
        formattedData[key] =
          typeof val === 'object' && val !== null
            ? JSON.stringify(val)
            : String(val);
      }
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
        let signatureHtml = `<span style="color: blue;">(Đã duyệt qua hệ thống)</span>`;
        
        if (snapshotObj.signature) {
          const hasImage = snapshotObj.signature.startsWith('data:image/');
          if (hasImage) {
            const isHorizontal = snapshotObj.layout === 'horizontal';
            const showName = snapshotObj.showSignerName !== false;
            const showRole = snapshotObj.showSignerRole !== false;
            const showDept = snapshotObj.showSignerDept !== false;
            const showTime = snapshotObj.showSigningTime !== false;

            if (isHorizontal) {
              signatureHtml = `
                <div style="display: inline-flex; align-items: center; gap: 12px; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; background-color: #fafafa; font-family: sans-serif; text-align: left;">
                  <div style="position: relative; height: 50px; min-width: 100px; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px;">
                    <img src="${snapshotObj.signature}" style="max-height: 44px; max-width: 96px; display: block;" />
                    ${snapshotObj.stamp ? `<img src="${snapshotObj.stamp}" style="position: absolute; right: -12px; bottom: -8px; max-height: 48px; max-width: 48px; opacity: 0.85; mix-blend-mode: multiply;" />` : ''}
                  </div>
                  <div style="line-height: 1.3;">
                    <div style="font-size: 8px; color: green; font-family: monospace; font-weight: bold; margin-bottom: 2px;">[ĐÃ KÝ ĐIỆN TỬ]</div>
                    ${showName ? `<div style="font-size: 11px; font-weight: bold; color: #1e293b;">${snapshotObj.signerName}</div>` : ''}
                    ${showRole ? `<div style="font-size: 9px; color: #64748b;">${snapshotObj.signerRole}</div>` : ''}
                    ${showDept ? `<div style="font-size: 9px; color: #64748b;">${snapshotObj.signerDept}</div>` : ''}
                    ${showTime ? `<div style="font-size: 8px; color: #94a3b8; margin-top: 1px;">${snapshotObj.signingTime}</div>` : ''}
                  </div>
                </div>
              `;
            } else {
              signatureHtml = `
                <div style="display: inline-flex; flex-direction: column; align-items: center; text-align: center; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; background-color: #fafafa; font-family: sans-serif; min-width: 130px; line-height: 1.3;">
                  <div style="font-size: 8px; color: green; font-family: monospace; font-weight: bold; margin-bottom: 4px;">[ĐÃ KÝ ĐIỆN TỬ]</div>
                  <div style="position: relative; height: 50px; width: 100px; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px; margin-bottom: 4px; margin-left: auto; margin-right: auto;">
                    <img src="${snapshotObj.signature}" style="max-height: 44px; max-width: 96px; display: block;" />
                    ${snapshotObj.stamp ? `<img src="${snapshotObj.stamp}" style="position: absolute; right: -12px; bottom: -8px; max-height: 48px; max-width: 48px; opacity: 0.85; mix-blend-mode: multiply;" />` : ''}
                  </div>
                  ${showName ? `<div style="font-size: 11px; font-weight: bold; color: #1e293b;">${snapshotObj.signerName}</div>` : ''}
                  ${showRole ? `<div style="font-size: 9px; color: #64748b; margin-top: 1px;">${snapshotObj.signerRole}</div>` : ''}
                  ${showDept ? `<div style="font-size: 9px; color: #64748b;">${snapshotObj.signerDept}</div>` : ''}
                  ${showTime ? `<div style="font-size: 8px; color: #94a3b8; margin-top: 2px;">${snapshotObj.signingTime}</div>` : ''}
                </div>
              `;
            }
          } else {
            // Text fallback / Old simple format
            signatureHtml = `<div style="border: 1px dashed green; color: green; padding: 5px; width: fit-content; font-size: 11px; margin-top: 5px; font-family: monospace; background-color: #f6fff6;">[KÝ ĐIỆN TỬ THÀNH CÔNG]<br/>Mã xác thực: ${snapshotObj.signature}<br/>Người ký: ${l.user?.fullName || snapshotObj.signerName}</div>`;
          }
        }

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
      data: formattedData,
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
