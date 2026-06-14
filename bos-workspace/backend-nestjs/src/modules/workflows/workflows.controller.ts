// File: src/modules/workflows/workflows.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Workflow Engine (Cỗ máy Quy trình)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo mới một Quy trình (Tự động sinh Version 1 - DRAFT)',
  })
  create(@Body() dto: CreateWorkflowDto) {
    return this.workflowsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách Quy trình' })
  findAll() {
    return this.workflowsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết Quy trình kèm các Phiên bản' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.workflowsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật tên/mô tả Quy trình' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(id, dto);
  }

  // --- API QUẢN LÝ VERSION ---
  @Post(':id/versions/:versionId/clone')
  @ApiOperation({
    summary: 'Nhân bản một Version thành Version mới (VD: V1 -> V2)',
  })
  cloneVersion(
    @Param('id', ParseIntPipe) workflowId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.workflowsService.cloneVersion(workflowId, versionId);
  }

  @Patch(':id/versions/:versionId/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái Version (PUBLISHED / ARCHIVED)',
  })
  updateVersionStatus(
    @Param('id', ParseIntPipe) workflowId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
    @Body('status') status: string,
  ) {
    return this.workflowsService.updateVersionStatus(
      workflowId,
      versionId,
      status,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa Quy trình (Chỉ xóa được khi chưa có phiếu chạy)',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.workflowsService.remove(id);
  }
}
