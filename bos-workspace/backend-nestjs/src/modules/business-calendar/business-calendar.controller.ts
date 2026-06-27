// File: src/modules/business-calendar/business-calendar.controller.ts
import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessCalendarService } from './business-calendar.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { tenantContext } from 'src/prisma/tenant-context';

@ApiTags('Business Calendar (Lịch làm việc doanh nghiệp)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('business-calendar')
export class BusinessCalendarController {
  constructor(private readonly calendarService: BusinessCalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy cấu hình lịch làm việc của Doanh nghiệp' })
  async getCalendar(@Request() req: any) {
    const tenantId = tenantContext.getStore()?.tenantId || req.user.tenantId;
    return this.calendarService.getOrCreateDefault(Number(tenantId));
  }

  @Patch()
  @ApiOperation({ summary: 'Cập nhật cấu hình lịch làm việc' })
  async updateCalendar(
    @Request() req: any,
    @Body() dto: { shifts: any[]; holidays: string[] },
  ) {
    const tenantId = tenantContext.getStore()?.tenantId || req.user.tenantId;
    return this.calendarService.update(
      Number(tenantId),
      dto.shifts,
      dto.holidays,
    );
  }
}
