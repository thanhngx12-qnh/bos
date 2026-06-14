// File: src/modules/fields/fields.controller.ts
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FieldsService } from './fields.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Metadata - Fields (Trường dữ liệu)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fields')
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo trường dữ liệu mới vào Entity' })
  create(@Body() dto: CreateFieldDto) {
    return this.fieldsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các trường dữ liệu của 1 Entity' })
  @ApiQuery({ name: 'entityId', required: true, type: Number })
  findAllByEntity(@Query('entityId', ParseIntPipe) entityId: number) {
    return this.fieldsService.findAllByEntity(entityId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết 1 trường dữ liệu' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fieldsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật trường dữ liệu' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFieldDto) {
    return this.fieldsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa trường dữ liệu' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.fieldsService.remove(id);
  }
}
