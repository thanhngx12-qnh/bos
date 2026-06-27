// File: src/modules/automation/automation.controller.ts
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
import { AutomationService } from './automation.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { tenantContext } from '../../prisma/tenant-context';

@ApiTags('Automation Rules (Quy tắc Tự động hóa)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Get('events')
  @ApiOperation({ summary: 'Lấy danh sách các sự kiện kích hoạt khả dụng' })
  findEvents(@Request() req) {
    const tenantId = tenantContext.getStore()?.tenantId || req.user.tenantId;
    return this.automationService.findEvents(tenantId);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Tạo mới một quy tắc tự động hóa' })
  create(@Request() req, @Body() dto: CreateRuleDto) {
    const tenantId = tenantContext.getStore()?.tenantId || req.user.tenantId;
    return this.automationService.create(tenantId, dto);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Lấy toàn bộ quy tắc tự động hóa' })
  findAll(@Request() req) {
    const tenantId = tenantContext.getStore()?.tenantId || req.user.tenantId;
    return this.automationService.findAll(tenantId);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Lấy chi tiết một quy tắc' })
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const tenantId = tenantContext.getStore()?.tenantId || req.user.tenantId;
    return this.automationService.findOne(tenantId, id);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: 'Cập nhật quy tắc tự động hóa' })
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRuleDto,
  ) {
    const tenantId = tenantContext.getStore()?.tenantId || req.user.tenantId;
    return this.automationService.update(tenantId, id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Xóa quy tắc tự động hóa' })
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const tenantId = tenantContext.getStore()?.tenantId || req.user.tenantId;
    return this.automationService.remove(tenantId, id);
  }
}
