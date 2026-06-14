// File: src/modules/organizations/departments.controller.ts
import { Controller, Post, Get, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('Departments (Cơ cấu tổ chức)')
// @ApiBearerAuth() // (Sẽ mở comment khi áp dụng JWT Guard)
@Controller('departments') // Tiền tố /api/v1 đã được set ở main.ts
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới phòng ban' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Lấy toàn bộ sơ đồ tổ chức (Dạng Cây)' })
  getTree() {
    return this.departmentsService.getTree();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin 1 phòng ban' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật phòng ban' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phòng ban' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.remove(id);
  }
}