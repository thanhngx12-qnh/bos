// File: src/modules/tasks/tasks.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CompleteTaskDto, DelegateTaskDto, BatchCompleteTasksDto } from './dto/task-action.dto';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { SuperAdminGuard } from 'src/core/guards/super-admin.guard';

@ApiTags('Work Engine - Tasks (Nhiệm vụ & Giao việc)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('my-tasks')
  @ApiOperation({
    summary: 'Lấy danh sách nhiệm vụ của tôi (Có phân trang & lọc trạng thái)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: 'PENDING',
  })
  findMyTasks(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.tasksService.findMyTasks(
      req.user.userId,
      { page, limit },
      status,
    );
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Thống kê KPI xử lý nhiệm vụ toàn công ty (Dành cho Quản lý)',
  })
  getAnalytics() {
    return this.tasksService.getTaskAnalytics();
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Hoàn thành nhiệm vụ (Tự động tính thời gian SLA)' })
  completeTask(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.tasksService.completeTask(id, req.user.userId, dto);
  }

  @Post('batch-complete')
  @ApiOperation({ summary: 'Duyệt nhanh hàng loạt nhiệm vụ' })
  batchCompleteTasks(
    @Request() req,
    @Body() dto: BatchCompleteTasksDto,
  ) {
    return this.tasksService.batchCompleteTasks(req.user.userId, dto);
  }

  @Post(':id/delegate')
  @ApiOperation({ summary: 'Ủy quyền nhiệm vụ cho người khác' })
  delegateTask(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DelegateTaskDto,
  ) {
    return this.tasksService.delegateTask(id, req.user.userId, dto);
  }

  @Get()
  @UseGuards(SuperAdminGuard) // Chỉ Admin mới được xem toàn bộ Task hệ thống
  @ApiOperation({ summary: 'Lấy toàn bộ danh sách Task (Super Admin)' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.tasksService.findAll({ page, limit });
  }
}
