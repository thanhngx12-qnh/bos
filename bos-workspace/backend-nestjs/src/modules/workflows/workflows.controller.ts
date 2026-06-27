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
import { Query, DefaultValuePipe } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

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
  @ApiOperation({
    summary:
      'Lấy danh sách Quy trình (Đã lọc theo tầm nhìn phân quyền, có phân trang & sắp xếp)',
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
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const currentUser = req.user;
    return this.workflowsService.findAll(currentUser, {
      page,
      limit,
      sortBy,
      sortOrder,
    });
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

  @Post('instances/:id/otp-request')
  @ApiOperation({ summary: 'Yêu cầu gửi mã xác thực OTP qua email để ký duyệt' })
  requestOtp(
    @Request() req,
    @Param('id', ParseIntPipe) instanceId: number,
    @Body('transitionId', ParseIntPipe) transitionId: number,
  ) {
    const userId = req.user.userId;
    return this.workflowsService.requestTransitionOtp(instanceId, transitionId, userId);
  }

  @Get('instances/:id/logs')
  @ApiOperation({ summary: 'Lấy lịch sử Audit Log phê duyệt của lượt chạy' })
  getInstanceLogs(@Param('id', ParseIntPipe) instanceId: number) {
    return this.workflowsService.getInstanceLogs(instanceId);
  }

  @Get('instances/record/:recordId/logs')
  @ApiOperation({ summary: 'Lấy lịch sử Audit Log của lượt chạy mới nhất theo recordId' })
  getRecordInstanceLogs(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.workflowsService.getLatestInstanceLogs(recordId);
  }

  @Get('instances/record/:recordId/progress')
  @ApiOperation({ summary: 'Lấy lộ trình và tiến độ phê duyệt của lượt chạy mới nhất' })
  getRecordInstanceProgress(@Param('recordId', ParseIntPipe) recordId: number) {
    return this.workflowsService.getLatestInstanceProgress(recordId);
  }
}
