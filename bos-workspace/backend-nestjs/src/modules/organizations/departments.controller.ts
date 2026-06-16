// File: src/modules/departments/departments.controller.ts
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Departments (Cơ cấu tổ chức V2 - Closure Table)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo mới phòng ban (Tự động tính toán Closure Table)',
  })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Get('tree')
  @ApiOperation({
    summary: 'Lấy sơ đồ tổ chức (Dạng Cây - Đã lọc các phòng ban bị xóa)',
  })
  getTree() {
    return this.departmentsService.getTree();
  }

  @Get(':id/descendants')
  @ApiOperation({
    summary: 'Lấy toàn bộ phòng ban con/cháu/chắt... (tốc độ < 1ms)',
  })
  getDescendants(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.getDescendants(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin 1 phòng ban' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật phòng ban (Cấm sửa phòng ban cha)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm phòng ban (Soft Delete)' })
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user.userId;
    return this.departmentsService.remove(id, userId);
  }
}
