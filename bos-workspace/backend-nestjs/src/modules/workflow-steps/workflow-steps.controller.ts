// File: src/modules/workflow-steps/workflow-steps.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowStepsService } from './workflow-steps.service';
import { CreateStepDto } from './dto/create-step.dto';
import { CreateTransitionDto } from './dto/create-transition.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Workflow Pipeline (Vẽ luồng quy trình)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflow-pipeline')
export class WorkflowStepsController {
  constructor(private readonly stepsService: WorkflowStepsService) {}

  @Post('steps')
  @ApiOperation({ summary: 'Tạo một bước duyệt mới (Step) vào Version DRAFT' })
  createStep(@Body() dto: CreateStepDto) {
    return this.stepsService.createStep(dto);
  }

  @Post('transitions')
  @ApiOperation({ summary: 'Tạo đường rẽ nhánh (Transition) giữa 2 Bước' })
  createTransition(@Body() dto: CreateTransitionDto) {
    return this.stepsService.createTransition(dto);
  }

  @Get('versions/:versionId')
  @ApiOperation({
    summary: 'Lấy toàn bộ sơ đồ các bước và rẽ nhánh của 1 Version',
  })
  getPipeline(@Param('versionId', ParseIntPipe) versionId: number) {
    return this.stepsService.getPipelineByVersion(versionId);
  }
}
