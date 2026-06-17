// File: src/modules/search/search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Hàm làm phẳng dữ liệu JSON và các trường text để tạo nội dung tìm kiếm
  private flattenDataForSearch(record: any): string {
    let content = record.title || '';
    content += ` ${record.businessCode || ''}`; // SỬA LỖI TẠI ĐÂY

    if (typeof record.data === 'object' && record.data !== null) {
      for (const value of Object.values(record.data)) {
        if (typeof value === 'string' || typeof value === 'number') {
          content += ` ${value}`;
        }
      }
    }
    return content.trim();
  }

  async syncRecordToSearch(record: any) {
    try {
      const content = this.flattenDataForSearch(record);

      await this.prisma.searchDocument.upsert({
        where: { recordId: record.id },
        update: {
          title: record.title,
          content: content,
          searchData: record.data,
        },
        create: {
          recordId: record.id,
          tenantId: record.tenantId,
          entityId: record.entityId,
          title: record.title,
          content: content,
          searchData: record.data,
        },
      });

      await this.prisma.$executeRawUnsafe(
        `UPDATE search_documents SET search_vector = to_tsvector('simple', content) WHERE record_id = $1`,
        record.id,
      );

      this.logger.log(
        `[Search Sync] Dong bo du lieu tim kiem cho Record ID: ${record.id} thanh cong.`,
      );
    } catch (error) {
      this.logger.error(
        `[Search Sync] Loi dong bo du lieu tim kiem cho Record ID: ${record.id}`,
        error,
      );
    }
  }
}
