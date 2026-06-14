// File: src/modules/workflows/workflows.controller.ts
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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { WorkflowActionDto } from './dto/workflow-action.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Workflow Engine (Cỗ máy Quy trình)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới một Quy trình' })
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

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa Quy trình' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.workflowsService.remove(id);
  }

  @Post(':id/versions/:versionId/clone')
  @ApiOperation({ summary: 'Nhân bản một Version thành Version mới' })
  cloneVersion(
    @Param('id', ParseIntPipe) workflowId: number,
    @Param('versionId', ParseIntPipe) versionId: number,
  ) {
    return this.workflowsService.cloneVersion(workflowId, versionId);
  }

  @Patch(':id/versions/:versionId/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái Version' })
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

  // ==========================================
  // API THỰC THI LUỒNG QUY TRÌNH (INSTANCES)
  // ==========================================
  @Post('instances/start')
  @ApiOperation({
    summary: 'Khởi chạy luồng quy trình cho 1 bản ghi (Trình ký phiếu)',
  })
  startInstance(@Request() req, @Body() dto: CreateInstanceDto) {
    const userId = req.user.userId;
    return this.workflowsService.startInstance(userId, dto);
  }

  @Post('instances/:id/action')
  @ApiOperation({ summary: 'Thực hiện Phê duyệt hoặc Từ chối phiếu' })
  handleAction(
    @Request() req,
    @Param('id', ParseIntPipe) instanceId: number,
    @Body() dto: WorkflowActionDto,
  ) {
    const userId = req.user.userId;
    return this.workflowsService.handleAction(instanceId, userId, dto);
  }

  @Get('instances/:id/logs')
  @ApiOperation({ summary: 'Lấy lịch sử Audit Log phê duyệt của lượt chạy' })
  getInstanceLogs(@Param('id', ParseIntPipe) instanceId: number) {
    return this.workflowsService.getInstanceLogs(instanceId);
  }
}
