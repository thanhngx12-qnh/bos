// File: src/modules/tasks/tasks.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksScheduler {
  private readonly logger = new Logger(TasksScheduler.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Chạy tự động mỗi phút (Tương lai có thể đổi thành EVERY_10_MINUTES)
  @Cron(CronExpression.EVERY_MINUTE)
  async handleOverdueTasks() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Tìm các task chưa hoàn thành và đã qua estimatedCompletionTime
      const overdueTasks = await this.prisma.task.findMany({
        where: {
          status: 'PENDING',
          estimatedCompletionTime: { lt: new Date() },
        } as any,
        include: {
          instance: { include: { record: true } },
        } as any,
      });

      if (overdueTasks.length === 0) {
        this.isProcessing = false;
        return;
      }

      this.logger.warn(
        `[SLA Alert Worker] Phát hiện ${overdueTasks.length} nhiệm vụ quá hạn. Đang phát lệnh báo động...`,
      );

      for (const task of overdueTasks) {
        // 2. Chuyển trạng thái thành OVERDUE (Quá hạn)
        await this.prisma.task.update({
          where: { id: task.id } as any,
          data: { status: 'OVERDUE' } as any,
        });

        // 3. Bắn còi báo động khẩn cấp cho người được giao
        if (task.assigneeId) {
          const recordCode =
            (task.instance as any).record?.businessCode ||
            `#${(task.instance as any).record?.id}`;

          await this.notificationsService.createNotification(
            task.assigneeId,
            '🚨 CẢNH BÁO: NHIỆM VỤ QUÁ HẠN SLA',
            `Nhiệm vụ phê duyệt phiếu [${recordCode}] của bạn đã QUÁ HẠN. Vui lòng xử lý ngay lập tức!`,
            {
              emailJobName: 'send-new-approval-request', // Mượn tạm template này để bắn mail
              emailPayload: {
                recipientName: 'Thành viên',
                recordCode: recordCode,
                initiatorName: 'Hệ thống SLA',
                stepName: 'CẢNH BÁO QUÁ HẠN',
              },
            },
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `[SLA Alert Worker] Lỗi khi quét tác vụ quá hạn: ${error.message}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }
}
