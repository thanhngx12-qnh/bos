import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Macro Analytics (Báo cáo Thống kê Vĩ mô)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('entities-summary')
  @ApiOperation({
    summary: 'Thống kê lượng bản ghi (phiếu) theo từng biểu mẫu',
  })
  getEntitiesSummary() {
    return this.analyticsService.getEntitiesSummary();
  }

  @Get('workflows-summary')
  @ApiOperation({ summary: 'Thống kê trạng thái phê duyệt của các quy trình' })
  getWorkflowsSummary() {
    return this.analyticsService.getWorkflowsSummary();
  }

  @Get('spending-by-department')
  @ApiOperation({
    summary:
      'Báo cáo vĩ mô: Thống kê tổng ngân sách đề xuất theo từng Phòng ban (Bóc tách JSONB)',
  })
  @ApiQuery({ name: 'entityId', required: false, type: Number })
  @ApiQuery({ name: 'amountField', required: false, type: String })
  getSpendingByDepartment(
    @Query('entityId') entityId?: string,
    @Query('amountField') amountField?: string,
  ) {
    const eid = entityId ? Number(entityId) : 1;
    const field = amountField || 'total_amount';
    return this.analyticsService.getSpendingByDepartment(eid, field);
  }
}
