// File: src/modules/print-templates/print-templates.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrintTemplatesService } from './print-templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Metadata - Print Templates (Mẫu in động)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('print-templates')
export class PrintTemplatesController {
  constructor(private readonly printTemplatesService: PrintTemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới một mẫu in cho Biểu mẫu' })
  create(@Body() dto: CreateTemplateDto) {
    return this.printTemplatesService.create(dto);
  }

  // --- HÀM BỔ SUNG ĐỂ SỬA LỖI 404 ---
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết cấu hình mẫu in' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.printTemplatesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật mẫu in' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.printTemplatesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mẫu in' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.printTemplatesService.remove(id);
  }

  @Get(':id/render/:recordId')
  @ApiOperation({
    summary: 'Biên dịch dữ liệu bản ghi vào Mẫu in ra mã HTML hoàn chỉnh',
  })
  renderTemplate(
    @Param('id', ParseIntPipe) templateId: number,
    @Param('recordId', ParseIntPipe) recordId: number,
  ) {
    return this.printTemplatesService.renderTemplate(templateId, recordId);
  }
}
