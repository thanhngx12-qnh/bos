// File: src/modules/users/user-signatures.controller.ts
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
import { UserSignaturesService } from './user-signatures.service';
import { CreateSignatureDto } from './dto/create-signature.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('User Signatures (Mẫu chữ ký & Con dấu cá nhân)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('signatures')
export class UserSignaturesController {
  constructor(private readonly userSignaturesService: UserSignaturesService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả các mẫu chữ ký/con dấu của tôi' })
  findAll(@Request() req) {
    const { tenantId, userId } = req.user;
    return this.userSignaturesService.findAll(tenantId, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo mới một mẫu chữ ký/con dấu' })
  create(@Request() req, @Body() dto: CreateSignatureDto) {
    const { tenantId, userId } = req.user;
    return this.userSignaturesService.create(tenantId, userId, dto);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Thiết lập mẫu chữ ký mặc định' })
  setDefault(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const { tenantId, userId } = req.user;
    return this.userSignaturesService.setDefault(tenantId, userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một mẫu chữ ký' })
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const { tenantId, userId } = req.user;
    return this.userSignaturesService.remove(tenantId, userId, id);
  }
}
