// File: src/main.ts
import 'dotenv/config'; // <-- BẮT BUỘC: Nạp biến môi trường .env toàn cục ngay dòng 1
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  // 4. Kích hoạt CORS cho Frontend
  app.enableCors();

  await app.listen(3000);
  console.log(`🚀 Application is running on: http://localhost:3000`);
  console.log(`📚 Swagger API Docs: http://localhost:3000/api-docs`);
}
bootstrap();
