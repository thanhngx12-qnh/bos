// File: src/modules/print-templates/print-templates.module.ts
import { Module } from '@nestjs/common';
import { PrintTemplatesService } from './print-templates.service';
import { PrintTemplatesController } from './print-templates.controller';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  imports: [AttachmentsModule],
  controllers: [PrintTemplatesController],
  providers: [PrintTemplatesService],
})
export class PrintTemplatesModule {}
