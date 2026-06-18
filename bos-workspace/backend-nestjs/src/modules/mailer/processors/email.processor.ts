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

      // BẢN VÁ: Đăng ký đầy đủ Case xử lý cho Thông báo hoàn tất quy trình [1]
      case 'send-workflow-completed':
        const {
          recipientEmail: completeEmail,
          recipientName: completeName,
          recordCode: completeCode,
          status,
        } = job.data;
        return this.mailerService.sendWorkflowCompleted(
          completeEmail,
          completeName,
          completeCode,
          status,
        );

      // BẢN VÁ: Đăng ký đầy đủ Case xử lý cho Email tùy biến của Automation Engine [1]
      case 'send-dynamic-email':
        const {
          recipientEmail: dynamicEmail,
          subject,
          body,
          recordData,
        } = job.data;
        return this.mailerService.sendDynamicEmail(
          dynamicEmail,
          subject,
          body,
          recordData,
        );

      default:
        this.logger.warn(
          `[Email Worker] Không tìm thấy xử lý cho Job: ${job.name}`,
        );
    }
  }
}
