// File: src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Đánh dấu Global để dùng Prisma ở mọi Module khác mà không cần import lại
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}