// File: src/modules/redis/redis.module.ts
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global() // Đánh dấu Global để mọi module khác (như Entities, Workflows) đều sử dụng được
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
