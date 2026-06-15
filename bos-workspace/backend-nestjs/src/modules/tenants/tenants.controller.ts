// File: src/modules/tenants/tenants.controller.ts
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
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../core/guards/super-admin.guard'; // <-- IMPORT Ổ KHÓA
import { Query, DefaultValuePipe } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

@ApiTags('Tenants (Quản lý Doanh nghiệp SaaS - Chỉ Super Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard) // <-- ÁP DỤNG ĐỒNG THỜI 2 Ổ KHÓA
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo một doanh nghiệp mới' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy toàn bộ danh sách doanh nghiệp (Có phân trang & Sắp xếp)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'id' })
  // SỬA LẠI ĐOẠN NÀY
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc', // Thêm giá trị mặc định vào đây
  ) {
    return this.tenantsService.findAll({ page, limit, sortBy, sortOrder });
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Lấy thông tin chi tiết doanh nghiệp kèm số lượng tài khoản/dữ liệu',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin doanh nghiệp' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Xóa vĩnh viễn doanh nghiệp & toàn bộ dữ liệu liên đới (Cascade Delete)',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.remove(id);
  }
}
