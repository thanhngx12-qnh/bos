// File: src/modules/events/events.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from 'src/core/interfaces/domain-event.interface';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private eventEmitter: EventEmitter2) {}

  publish(event: DomainEvent) {
    this.logger.log(`[Event Bus] Publishing event: ${event.eventType}`);

    // BẢN VÁ: Tách biệt xử lý bất đồng bộ để không chặn luồng HTTP của Client
    Promise.resolve()
      .then(() => {
        this.eventEmitter.emit(event.eventType, event);
      })
      .catch((err) => {
        this.logger.error(
          `[Event Bus] Lỗi bất đồng bộ khi phát sự kiện: ${err.message}`,
        );
      });
  }
}
