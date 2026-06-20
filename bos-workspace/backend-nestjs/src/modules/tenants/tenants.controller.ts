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
  Request,
  ForbiddenException,
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
@UseGuards(JwtAuthGuard) // <-- CHỈ YÊU CẦU ĐĂNG NHẬP Ở CẤP CONTROLLER
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Tạo một doanh nghiệp mới' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary: 'Lấy toàn bộ danh sách doanh nghiệp (Có phân trang & Sắp xếp)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'id' })
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
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.tenantsService.findAll({ page, limit, sortBy, sortOrder });
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Lấy thông tin chi tiết doanh nghiệp kèm số lượng tài khoản/dữ liệu',
  })
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const user = req.user;
    // Super Admin (tenantId === null) can access anything. Tenant user can only access their own.
    if (user.tenantId !== null && user.tenantId !== id) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập thông tin của doanh nghiệp khác.',
      );
    }
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Cập nhật thông tin doanh nghiệp' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({
    summary:
      'Xóa vĩnh viễn doanh nghiệp & toàn bộ dữ liệu liên đới (Cascade Delete)',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.remove(id);
  }
}
