// File: src/modules/redis/redis.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { Observable } from 'rxjs'; // Import thư viện Reactive Stream nâng cao

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  onModuleInit() {
    // Đấu nối với Redis (ưu tiên REDIS_URL kết nối string)
    if (process.env.REDIS_URL) {
      this.redisClient = new Redis(process.env.REDIS_URL);
    } else {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      });
    }
  }

  onModuleDestroy() {
    this.redisClient.quit();
  }

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redisClient.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.redisClient.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  // --- HÀM MỚI 1: PHÁT SỰ KIỆN LÊN REDIS (PUBLISH) ---
  async publish(channel: string, message: string): Promise<number> {
    return this.redisClient.publish(channel, message);
  }

  // --- HÀM MỚI 2: THUẬT TOÁN ĐỈNH CAO: TỰ ĐỘNG QUẢN LÝ KẾT NỐI SSE ĐƯỜNG TRUYỀN ---
  // Tạo ra một Stream Observable động, tự khởi tạo và tự hủy kết nối S3/Redis khi client ngắt kết nối
  createSubscriptionObservable(channel: string): Observable<string> {
    return new Observable<string>((observer) => {
      // Mỗi kết nối SSE mở ra sẽ tạo riêng 1 subClient độc lập để an toàn dữ liệu
      const subClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      });

      subClient.subscribe(channel);

      subClient.on('message', (chan, message) => {
        if (chan === channel) {
          observer.next(message); // Đẩy tin nhắn vào dòng stream
        }
      });

      // HÀM CLEANUP: Tự động chạy khi người dùng đóng tab trình duyệt
      return () => {
        subClient.unsubscribe(channel);
        subClient.quit(); // Đóng kết nối Redis lập tức để tránh tràn RAM máy chủ
        console.log(
          `[REDIS SUB] Da dong ket noi va huy dang ky kenh: ${channel}`,
        );
      };
    });
  }
}
