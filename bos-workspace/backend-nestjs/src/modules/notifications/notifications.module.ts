// File: src/modules/notifications/notifications.module.ts
import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], // Export để WorkflowsService gọi dùng ở Chặng 3
})
export class NotificationsModule {}
