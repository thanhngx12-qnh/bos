// File: src/main.ts
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // --- SỬA LỖI TẠI ĐÂY ---
  // Thiết lập tiền tố toàn cục /api/v1, NHƯNG loại trừ đường dẫn /metrics ra khỏi nó
  app.setGlobalPrefix('api/v1', { exclude: ['/metrics'] });

  const config = new DocumentBuilder()
    .setTitle('BOS Core Engine API')
    .setDescription(
      'Tài liệu API cho Nền tảng Quản trị Doanh nghiệp (BOS v2.0)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  if (process.env.NODE_ENV !== 'production') {
    const outputPath = path.resolve(process.cwd(), 'openapi-spec.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
    console.log(`📝 [OPENAPI SPEC] Da tu dong xuat file tai: ${outputPath}`);
  }

  app.enableCors();

  await app.listen(3000);
  console.log(`🚀 Application is running on: http://localhost:3000`);
  console.log(`📚 Swagger API Docs: http://localhost:3000/api-docs`);
  console.log(`📊 Prometheus Metrics: http://localhost:3000/metrics`); // Thêm dòng log này để dễ truy cập
}
bootstrap();
