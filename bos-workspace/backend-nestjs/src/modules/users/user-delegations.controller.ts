// File: src/modules/users/user-delegations.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserDelegationsService } from './user-delegations.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Approval Delegations (Ủy quyền Phê duyệt)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('delegations')
export class UserDelegationsController {
  constructor(private readonly userDelegationsService: UserDelegationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả các cấu hình ủy quyền phê duyệt của tôi' })
  findAll(@Request() req) {
    const { tenantId, userId } = req.user;
    return this.userDelegationsService.findAll(tenantId, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Thiết lập quy tắc ủy quyền phê duyệt mới' })
  create(@Request() req, @Body() dto: CreateDelegationDto) {
    const { tenantId, userId } = req.user;
    return this.userDelegationsService.create(tenantId, userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Bật/Tắt trạng thái kích hoạt của quy tắc ủy quyền' })
  update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    const { tenantId, userId } = req.user;
    return this.userDelegationsService.update(tenantId, userId, id, isActive);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một quy tắc ủy quyền phê duyệt' })
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const { tenantId, userId } = req.user;
    return this.userDelegationsService.remove(tenantId, userId, id);
  }
}
