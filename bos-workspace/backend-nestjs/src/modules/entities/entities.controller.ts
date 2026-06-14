// File: src/modules/entities/entities.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EntitiesService } from './entities.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Metadata - Entities (Thực thể / Biểu mẫu)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entities')
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo Entity mới (VD: Phiếu xin nghỉ)' })
  create(@Body() dto: CreateEntityDto) {
    return this.entitiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các Entities' })
  findAll() {
    return this.entitiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết Entity kèm danh sách các trường (Fields)',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.entitiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin Entity' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEntityDto) {
    return this.entitiesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa Entity' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.entitiesService.remove(id);
  }
}
