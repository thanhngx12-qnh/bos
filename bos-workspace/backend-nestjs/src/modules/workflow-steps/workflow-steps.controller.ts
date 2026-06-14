// File: src/modules/workflow-steps/workflow-steps.controller.ts
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
import { WorkflowStepsService } from './workflow-steps.service';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { CreateTransitionDto } from './dto/create-transition.dto';
import { UpdateTransitionDto } from './dto/update-transition.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Workflow Pipeline (Vẽ luồng quy trình)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflow-pipeline')
export class WorkflowStepsController {
  constructor(private readonly stepsService: WorkflowStepsService) {}

  // --- STEPS ---
  @Post('steps')
  @ApiOperation({ summary: 'Tạo bước duyệt mới vào Version DRAFT' })
  createStep(@Body() dto: CreateStepDto) {
    return this.stepsService.createStep(dto);
  }

  @Patch('steps/:id')
  @ApiOperation({ summary: 'Cập nhật bước duyệt' })
  updateStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStepDto,
  ) {
    return this.stepsService.updateStep(id, dto);
  }

  @Delete('steps/:id')
  @ApiOperation({ summary: 'Xóa bước duyệt' })
  removeStep(@Param('id', ParseIntPipe) id: number) {
    return this.stepsService.removeStep(id);
  }

  // --- TRANSITIONS ---
  @Post('transitions')
  @ApiOperation({ summary: 'Tạo đường rẽ nhánh giữa 2 Bước' })
  createTransition(@Body() dto: CreateTransitionDto) {
    return this.stepsService.createTransition(dto);
  }

  @Patch('transitions/:id')
  @ApiOperation({ summary: 'Cập nhật logic rẽ nhánh' })
  updateTransition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransitionDto,
  ) {
    return this.stepsService.updateTransition(id, dto);
  }

  @Delete('transitions/:id')
  @ApiOperation({ summary: 'Xóa đường rẽ nhánh' })
  removeTransition(@Param('id', ParseIntPipe) id: number) {
    return this.stepsService.removeTransition(id);
  }

  // --- PIPELINE ---
  @Get('versions/:versionId')
  @ApiOperation({ summary: 'Lấy toàn bộ sơ đồ các bước và rẽ nhánh' })
  getPipeline(@Param('versionId', ParseIntPipe) versionId: number) {
    return this.stepsService.getPipelineByVersion(versionId);
  }
}
