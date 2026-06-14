// File: src/modules/organizations/departments.controller.ts
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard'; // <-- Import ổ khóa

@ApiTags('Departments (Cơ cấu tổ chức)')
@ApiBearerAuth() // <-- Mở nút nhập Token trên Swagger
@UseGuards(JwtAuthGuard) // <-- BẬT Ổ KHÓA BẢO MẬT
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới phòng ban' })
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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa phòng ban' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.departmentsService.remove(id);
  }
}
