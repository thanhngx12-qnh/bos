// File: src/modules/notifications/notifications.module.ts
import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq'; // <-- IMPORT BULLMODULE
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Global()
@Module({
  imports: [
    // KHAI BÁO CHO MODULE NÀY BIẾT NÓ SẼ DÙNG HÀNG ĐỢI EMAIL
    BullModule.registerQueue({
      name: 'email-queue',
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
