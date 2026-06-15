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

  // --- ENDPOINT MỚI: ĐỘNG CƠ TRA CỨU LIÊN KẾT ĐỘNG (LOOKUP ENGINE) ---
  @Get('lookup/:fieldId')
  @ApiOperation({
    summary: 'Lấy danh sách dữ liệu tra cứu liên kết động chéo biểu mẫu',
  })
  getLookupData(@Param('fieldId', ParseIntPipe) fieldId: number) {
    return this.recordsService.getLookupData(fieldId);
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
  @ApiOperation({
    summary: 'Cập nhật nội dung bản ghi (Tự động ghi Log Lịch sử)',
  })
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecordDto,
  ) {
    const userId = req.user.userId; // Trích xuất ID người sửa từ JWT
    return this.recordsService.update(userId, id, dto); // Truyền đúng thứ tự: userId trước, sau đó là id và dto
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bản ghi' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.recordsService.remove(id);
  }

  @Get(':id/revisions')
  @ApiOperation({
    summary: 'Lấy lịch sử các lần chỉnh sửa dữ liệu (Audit Trail)',
  })
  getRevisions(@Param('id', ParseIntPipe) id: number) {
    return this.recordsService.getRecordRevisions(id);
  }
}
