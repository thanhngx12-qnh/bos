// File: src/modules/attachments/attachments.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentsService } from './attachments.service';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

@ApiTags('Metadata - Attachments (Quản lý tệp tin S3/MinIO)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Tải tệp đính kèm lên Cloudflare R2 / S3' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        recordId: {
          type: 'number',
          description: 'ID của Bản ghi (Không bắt buộc)',
        },
      },
    },
  })
  uploadFile(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAttachmentDto,
  ) {
    const userId = req.user.userId;
    return this.attachmentsService.uploadFile(userId, file, dto.recordId);
  }

  @Get(':id/view')
  @ApiOperation({
    summary: 'Lấy đường dẫn có chữ ký số (Presigned URL) có hiệu lực 15 phút',
  })
  getPresignedUrl(@Param('id', ParseIntPipe) id: number) {
    return this.attachmentsService.getPresignedUrl(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tệp tin' })
  removeFile(@Param('id', ParseIntPipe) id: number) {
    return this.attachmentsService.removeFile(id);
  }
}
