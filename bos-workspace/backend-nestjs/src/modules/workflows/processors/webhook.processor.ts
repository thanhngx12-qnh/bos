// File: src/modules/workflows/processors/webhook.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import axios from 'axios';

@Processor('webhook-queue')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    const { webhookUrl, payload, instanceId } = job.data;

    this.logger.log(
      `[Webhook Worker] Bat dau ban du lieu cua Instance ID ${instanceId} den ${webhookUrl}`,
    );

    try {
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-BOS-Signature': 'BOS-Enterprise-Webhook-Trigger', // Header định danh của hệ thống chúng ta
        },
        timeout: 5000, // Timeout 5s để tránh worker bị treo quá lâu
      });

      this.logger.log(
        `[Webhook Worker] Thanh cong! Trang thai: ${response.status}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `[Webhook Worker] That bai khi ban den ${webhookUrl}: ${error.message}`,
      );
      // Ném lỗi để BullMQ biết job này thất bại và tự động retry (nếu cấu hình)
      throw new Error(`Webhook Error: ${error.message}`);
    }
  }
}
