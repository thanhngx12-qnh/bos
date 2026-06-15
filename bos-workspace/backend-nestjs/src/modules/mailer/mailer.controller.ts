// File: src/modules/mailer/mailer.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MailerService } from './mailer.service';

@ApiTags('Mailer (Kiểm thử Gửi Email)')
@Controller('mailer')
export class MailerController {
  constructor(private readonly mailerService: MailerService) {}

  @Post('test')
  @ApiOperation({ summary: 'Gửi email test đến địa chỉ thật' })
  async testEmail(@Body('email') email: string) {
    // Gọi hàm gửi email với dữ liệu giả lập
    await this.mailerService.sendNewApprovalRequest(
      email,
      'Quản lý Cấp cao',
      'QTMS-9999',
      'Nguyễn Văn A',
      'Giám đốc phê duyệt',
    );
    return {
      message: `Đã phát lệnh gửi email tới ${email}. Vui lòng kiểm tra hộp thư (và thư mục Spam)!`,
    };
  }
}
