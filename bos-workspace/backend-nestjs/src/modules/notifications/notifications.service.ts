// File: src/modules/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { tenantContext } from '../../prisma/tenant-context';
import { paginate, PaginateOptions } from '../../prisma/prisma.helper';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue, // <-- INJECT HÀNG ĐỢI EMAIL
  ) {}

  async createNotification(
    userId: number,
    title: string,
    message: string,
    options: {
      emailPayload?: any; // Dữ liệu để gửi email
      emailJobName?: string; // Tên job email
    } = {},
  ) {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId || 0;

    // 1. Ghi thông báo vào Database
    const notification = await this.prisma.notification.create({
      data: { userId, title, message },
    });

    // 2. Bắn thông báo thời gian thực SSE qua Redis Pub/Sub
    const channel = `tenant:${tenantId}:user:${userId}:notifications`;
    await this.redis.publish(channel, JSON.stringify(notification));
    console.log(
      `[REDIS PUB] Da phat thong bao thoi gian thuc tren kenh: ${channel}`,
    );

    // --- BƯỚC NÂNG CẤP: TỰ ĐỘNG ĐẨY JOB GỬI EMAIL VÀO HÀNG ĐỢI ---
    if (options.emailPayload && options.emailJobName) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });

      // Chỉ gửi email cho nhân sự nội bộ (INTERNAL) có email thật
      if (user && user.userType === 'INTERNAL' && user.email) {
        await this.emailQueue.add(
          options.emailJobName,
          { ...options.emailPayload, recipientEmail: user.email },
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );
        console.log(
          `[Email Queue] Đã xếp hàng tác vụ gửi email '${options.emailJobName}' tới: ${user.email}`,
        );
      }
    }

    return notification;
  }

  async findAllForUser(userId: number, options: PaginateOptions) {
    return paginate(this.prisma.notification, { userId }, options);
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification)
      throw new NotFoundException('Không tìm thấy thông báo tương ứng.');
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
