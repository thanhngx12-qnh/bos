// File: src/modules/search/search.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Search (Tìm kiếm toàn cục)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Tìm kiếm hồ sơ toàn cục trong doanh nghiệp' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Từ khóa tìm kiếm' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async search(
    @Request() req,
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const tenantId = req.user.tenantId || 0;
    return this.searchService.search(tenantId, query, limit);
  }
}
