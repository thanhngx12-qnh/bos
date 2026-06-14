// File: src/app.module.ts
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RolesModule } from './modules/roles/roles.module'; // <-- Import mới
import { UsersModule } from './modules/users/users.module'; // <-- Import mới

@Module({
  imports: [
    PrismaModule,
    OrganizationsModule,
    RolesModule, // <-- Kích hoạt Module
    UsersModule, // <-- Kích hoạt Module
    ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}