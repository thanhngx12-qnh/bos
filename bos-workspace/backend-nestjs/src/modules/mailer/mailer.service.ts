// File: src/modules/mailer/mailer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Khởi tạo kết nối SMTP trực tiếp bằng Nodemailer thuần
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true nếu dùng port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendNewApprovalRequest(
    recipientEmail: string,
    recipientName: string,
    recordCode: string,
    initiatorName: string,
    stepName: string,
  ) {
    try {
      // 1. Đọc nội dung file template HTML từ ổ đĩa
      const templatePath = path.join(
        process.cwd(),
        'src/modules/mailer/templates/new-approval-request.hbs',
      );
      const templateSource = fs.readFileSync(templatePath, 'utf8');

      // 2. Biên dịch template bằng Handlebars và nạp dữ liệu động
      const template = handlebars.compile(templateSource);
      const htmlToSend = template({
        recipientName,
        recordCode,
        initiatorName,
        stepName,
      });

      // 3. Tiến hành gửi Email
      await this.transporter.sendMail({
        from: `"BOS Platform" <${process.env.MAIL_FROM || 'no-reply@bos.com'}>`,
        to: recipientEmail,
        subject: `[BOS] Yêu cầu phê duyệt mới: ${recordCode}`,
        html: htmlToSend,
      });

      this.logger.log(
        `[Email Engine] Đã gửi thông báo phê duyệt tới: ${recipientEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `[Email Engine] Lỗi khi gửi email tới ${recipientEmail}: ${error.message}`,
      );
    }
  }
}
