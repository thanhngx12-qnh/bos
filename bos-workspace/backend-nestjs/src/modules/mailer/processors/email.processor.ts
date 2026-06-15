// File: src/modules/mailer/processors/email.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { MailerService } from '../mailer.service';

@Processor('email-queue')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`[Email Worker] Bắt đầu xử lý Job gửi email: ${job.name}`);

    // Dựa vào tên Job để gọi đúng hàm gửi email tương ứng
    switch (job.name) {
      case 'send-new-approval-request':
        const {
          recipientEmail,
          recipientName,
          recordCode,
          initiatorName,
          stepName,
        } = job.data;
        return this.mailerService.sendNewApprovalRequest(
          recipientEmail,
          recipientName,
          recordCode,
          initiatorName,
          stepName,
        );
      // Có thể thêm các case khác như: 'send-workflow-completed'...
      default:
        this.logger.warn(
          `[Email Worker] Không tìm thấy xử lý cho Job: ${job.name}`,
        );
    }
  }
}
