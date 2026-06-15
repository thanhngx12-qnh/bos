// File: src/modules/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Sse,
} from '@nestjs/common'; // <-- THÊM Sse
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RedisService } from '../redis/redis.service'; // <-- IMPORT REDIS
import { Observable } from 'rxjs'; // <-- IMPORT OBSERVALBE
import { map } from 'rxjs/operators';
import { Query, DefaultValuePipe } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

@ApiTags('Notifications (Hộp thư thông báo)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly redisService: RedisService, // <-- INJECT REDIS SERVICE
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo (Có phân trang)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  findAllForUser(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const userId = req.user.userId;
    return this.notificationsService.findAllForUser(userId, { page, limit });
  }

  // --- CỔNG TRUYỀN TIN THỜI GIAN THỰC: SERVER-SENT EVENTS (SSE) ---
  @Sse('stream')
  @ApiOperation({ summary: 'Kênh truyền tin thông báo thời gian thực (SSE)' })
  streamNotifications(@Request() req): Observable<any> {
    const userId = req.user.userId;
    const tenantId = req.user.tenantId || 0; // Trích xuất thông tin doanh nghiệp từ JWT

    const channel = `tenant:${tenantId}:user:${userId}:notifications`;
    console.log(
      `[SSE CONNECT] User ID ${userId} mo ket noi nhan thong bao tren kenh: ${channel}`,
    );

    // Kết nối luồng Observable với hàng đợi Redis Pub/Sub
    return this.redisService.createSubscriptionObservable(channel).pipe(
      map((message) => {
        const notification = JSON.parse(message);
        // Format đúng chuẩn MessageEvent của trình duyệt để Frontend hứng trực tiếp qua EventSource
        return { data: notification };
      }),
    );
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc một thông báo' })
  markAsRead(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu đã đọc TOÀN BỘ thông báo' })
  markAllAsRead(@Request() req) {
    const userId = req.user.userId;
    return this.notificationsService.markAllAsRead(userId);
  }
}
