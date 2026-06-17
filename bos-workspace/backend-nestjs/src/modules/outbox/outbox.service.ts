// File: src/modules/outbox/outbox.service.ts
import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { DomainEvent } from 'src/core/interfaces/domain-event.interface';
import { v4 as uuidv4 } from 'uuid';

type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class OutboxService {
  async addToOutbox(tx: PrismaTransaction, event: DomainEvent) {
    return tx.outbox.create({
      data: {
        tenantId: event.metadata.tenantId,
        eventKey: uuidv4(), // Idempotency Key
        eventType: event.eventType,
        payload: event.payload as any,
        correlationId: event.metadata.correlationId,
        causationId: event.metadata.causationId,
        requestId: uuidv4(), // Placeholder
      },
    });
  }
}
