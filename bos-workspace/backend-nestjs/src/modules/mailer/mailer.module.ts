// File: src/modules/mailer/mailer.module.ts
import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailerService } from './mailer.service';
import { MailerController } from './mailer.controller';
import { EmailProcessor } from './processors/email.processor'; // <-- IMPORT WORKER MỚI

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email-queue',
    }),
  ],
  controllers: [MailerController],
  providers: [MailerService, EmailProcessor], // <-- ĐĂNG KÝ WORKER VÀO ĐÂY
  exports: [MailerService],
})
export class MailerModule {}
