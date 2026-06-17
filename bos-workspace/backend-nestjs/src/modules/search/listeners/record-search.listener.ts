// File: src/modules/search/listeners/record-search.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { DomainEvent } from 'src/core/interfaces/domain-event.interface'; // <-- THÊM "type" VÀO ĐÂY
import { SearchService } from '../search.service';

@Injectable()
export class RecordSearchListener {
  private readonly logger = new Logger(RecordSearchListener.name);

  constructor(private readonly searchService: SearchService) {}

  @OnEvent('record.created')
  async handleRecordCreated(event: DomainEvent) {
    this.logger.log(
      `[Event Listener] Nhan su kien record.created, Record ID: ${event.payload.id}. Bat dau dong bo Search...`,
    );
    await this.searchService.syncRecordToSearch(event.payload);
  }

  @OnEvent('record.updated')
  async handleRecordUpdated(event: DomainEvent) {
    this.logger.log(
      `[Event Listener] Nhan su kien record.updated, Record ID: ${event.payload.id}. Bat dau dong bo Search...`,
    );
    // Chú ý: Ở hàm update, payload của chúng ta có cấu trúc khác
    const recordToSync = (event.payload as any).updatedRecord || event.payload;
    await this.searchService.syncRecordToSearch(recordToSync);
  }
}
