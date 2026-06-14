// File: src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 1. Lấy URL kết nối (Lấy từ môi trường hoặc dùng mặc định theo file .env của chúng ta)
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/bos_core_db?schema=public';
    
    // 2. Khởi tạo pool kết nối bằng thư viện `pg` thuần
    const pool = new Pool({ connectionString });
    
    // 3. Bọc pool trong PrismaPg Adapter
    const adapter = new PrismaPg(pool);
    
    // 4. Khởi tạo PrismaClient với adapter (BẮT BUỘC ở Prisma 7)
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}