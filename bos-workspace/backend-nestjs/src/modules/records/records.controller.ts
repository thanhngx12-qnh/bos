// File: src/modules/records/records.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RecordsService } from './records.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Metadata - Records (Dữ liệu bản ghi)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm mới một bản ghi (Submit Form)' })
  create(@Request() req, @Body() dto: CreateRecordDto) {
    // req.user được Inject tự động từ JwtStrategy
    const userId = req.user.userId;
    return this.recordsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các bản ghi của 1 Biểu mẫu' })
  @ApiQuery({ name: 'entityId', required: true, type: Number })
  findAllByEntity(@Query('entityId', ParseIntPipe) entityId: number) {
    return this.recordsService.findAllByEntity(entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết 1 bản ghi' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.recordsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật nội dung bản ghi' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRecordDto) {
    return this.recordsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bản ghi' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.recordsService.remove(id);
  }
}
