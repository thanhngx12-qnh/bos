// File: src/app.module.ts
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';

@Module({
  imports: [
    PrismaModule,
    OrganizationsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe, // Kích hoạt class-validator toàn cục
    },
  ],
})
export class AppModule {}