// File: src/main.ts
import 'dotenv/config'; // <-- BẮT BUỘC: Nạp biến môi trường .env toàn cục ngay dòng 1
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs'; // <-- IMPORT THƯ VIỆN GHI FILE CỦA NODE.JS
import * as path from 'path'; // <-- IMPORT THƯ VIỆN ĐƯỜNG DẪN CỦA NODE.JS

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Kích hoạt Class Validator toàn cục
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // 2. Thiết lập tiền tố API (VD: http://localhost:3000/api/v1/...)
  app.setGlobalPrefix('api/v1');

  // 3. Cấu hình Swagger Document
  const config = new DocumentBuilder()
    .setTitle('BOS Core Engine API')
    .setDescription(
      'Tài liệu API cho Nền tảng Quản trị Doanh nghiệp (BOS v2.0)',
    )
    .setVersion('1.0')
    .addBearerAuth() // Nút đăng nhập Token trên Swagger
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // Đường dẫn truy cập Swagger

  // TỰ ĐỘNG XUẤT FILE OPENAPI SPEC KHI RUN DEV (Để đồng bộ Types cho Frontend)
  if (process.env.NODE_ENV !== 'production') {
    const outputPath = path.resolve(process.cwd(), 'openapi-spec.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
    console.log(`📝 [OPENAPI SPEC] Da tu dong xuat file tai: ${outputPath}`);
  }

  // 4. Kích hoạt CORS cho Frontend
  app.enableCors();

  await app.listen(3000);
  console.log(`🚀 Application is running on: http://localhost:3000`);
  console.log(`📚 Swagger API Docs: http://localhost:3000/api-docs`);
}
bootstrap();
