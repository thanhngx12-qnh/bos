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
  DefaultValuePipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
    const userId = req.user.userId;
    return this.recordsService.create(userId, dto);
  }

  @Get('lookup/:fieldId')
  @ApiOperation({
    summary: 'Lấy danh sách dữ liệu tra cứu liên kết động chéo biểu mẫu',
  })
  getLookupData(@Param('fieldId', ParseIntPipe) fieldId: number) {
    return this.recordsService.getLookupData(fieldId);
  }

  @Get('lookup-last-trip')
  @ApiOperation({ summary: 'Tìm kiếm lượt đi gần nhất của xe để tự điền thông tin' })
  @ApiQuery({ name: 'licensePlate', required: true, type: String })
  lookupLastTrip(@Request() req, @Query('licensePlate') licensePlate: string) {
    const tenantId = req.user.tenantId;
    return this.recordsService.lookupLastTrip(tenantId, licensePlate);
  }

  @Get('power-plug-report')
  @ApiOperation({ summary: 'Xuất báo cáo cắm điện container lạnh dạng CSV (Excel)' })
  @ApiQuery({ name: 'date', required: false, type: String })
  async getPowerPlugReport(
    @Request() req,
    @Res() res: Response,
    @Query('date') date?: string,
  ) {
    const tenantId = req.user.tenantId;
    const data = await this.recordsService.getPowerPlugReport(tenantId, date);

    let csv = '\ufeff'; // UTF-8 BOM
    csv += 'ID,Mã hồ sơ,Biển số xe,Số Container,Chủ hàng,Loại hình,Thời gian cắm,Thời gian rút,Số giờ cắm (h),Trạng thái\n';

    for (const row of data) {
      csv += `"${row.id}","${row.businessCode}","${row.bienSo}","${row.soCont}","${row.chuHang}","${row.loaiHinh}","${row.thoiGianCam}","${row.thoiGianRut}","${row.durationHours}","${row.status}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=power-plug-report.csv');
    res.status(200).send(csv);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lấy danh sách bản ghi phân trang, tìm kiếm và lọc động vạn năng (Áp dụng RLS)',
  })
  @ApiQuery({ name: 'entityId', required: true, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'total_amount',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({
    name: 'searchQuery',
    required: false,
    type: String,
    example: 'Cisco',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    type: String,
    description: 'JSON string: {"plug_status":"DA_RUT"}',
  })
  findAllByEntity(
    @Request() req, // <-- TRUYỀN THÊM REQ.USER ĐỂ BẢO MẬT DÒNG (RLS)
    @Query('entityId', ParseIntPipe) entityId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
    @Query('searchQuery') searchQuery?: string,
    @Query('filters') filtersRaw?: string,
  ) {
    const currentUser = req.user;
    return this.recordsService.findAllByEntity(
      currentUser, // <-- TRUYỀN XUỐNG DỊCH VỤ
      entityId,
      page,
      limit,
      sortBy,
      sortOrder,
      searchQuery,
      filtersRaw,
    );
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
    const userId = req.user.userId;
    return this.recordsService.update(userId, id, dto);
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
