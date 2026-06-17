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
    this.eventEmitter.emit(event.eventType, event);
  }
}
