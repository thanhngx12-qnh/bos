// File: src/modules/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service'; // <-- IMPORT REDIS
import { tenantContext } from '../../prisma/tenant-context'; // <-- IMPORT CONTEXT

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService, // <-- INJECT REDIS SERVICE
  ) {}

  async createNotification(userId: number, title: string, message: string) {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId || 0;

    // 1. Ghi thông báo vào Database làm lịch sử
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
      },
    });

    // 2. PHÁT SỰ KIỆN LÊN REDIS PUB/SUB ĐỂ THÔNG BÁO THỜI GIAN THỰC
    // Kênh truyền tin được cô lập theo mô hình SaaS: tenant:1:user:1:notifications
    const channel = `tenant:${tenantId}:user:${userId}:notifications`;

    await this.redis.publish(channel, JSON.stringify(notification));
    console.log(
      `[REDIS PUB] Da phat thong bao thoi gian thuc tren kenh: ${channel}`,
    );

    return notification;
  }

  async findAllForUser(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo tương ứng.');
    }

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
