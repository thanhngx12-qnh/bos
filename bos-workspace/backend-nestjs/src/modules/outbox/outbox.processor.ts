// File: src/modules/outbox/outbox.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class OutboxProcessor {
  private readonly logger = new Logger(OutboxProcessor.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  @Cron(CronExpression.EVERY_SECOND) // Quét mỗi giây
  async handleCron() {
    if (this.isProcessing) {
      this.logger.warn(
        'Previous outbox processing is still running. Skipping.',
      );
      return;
    }

    this.isProcessing = true;
    this.logger.log('Start processing outbox...');

    try {
      const eventsToProcess = await this.prisma.$transaction(async (tx) => {
        // Dùng SELECT FOR UPDATE SKIP LOCKED để nhiều worker không giành giật cùng 1 event
        const events = await tx.$queryRawUnsafe<any[]>(
          `SELECT * FROM outbox WHERE status = 'PENDING' ORDER BY "created_at" ASC LIMIT 10 FOR UPDATE SKIP LOCKED`,
        );

        if (events.length > 0) {
          const ids = events.map((e) => e.id);
          await tx.outbox.updateMany({
            where: { id: { in: ids } },
            data: { status: 'PROCESSING' },
          });
        }
        return events;
      });

      for (const event of eventsToProcess) {
        try {
          this.eventsService.publish({
            eventType: event.event_type,
            payload: event.payload,
            metadata: {
              tenantId: event.tenant_id,
              correlationId: event.correlation_id,
              causationId: event.causation_id,
              timestamp: event.created_at.toISOString(),
            },
          });

          await this.prisma.outbox.update({
            where: { id: event.id },
            data: { status: 'COMPLETED' },
          });
        } catch (publishError) {
          await this.prisma.outbox.update({
            where: { id: event.id },
            data: { status: 'FAILED' },
          });
        }
      }
    } catch (error) {
      this.logger.error('Error processing outbox:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}
