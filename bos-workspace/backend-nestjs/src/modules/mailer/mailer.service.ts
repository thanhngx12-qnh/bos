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
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // 1. Gửi thông báo trình ký yêu cầu phê duyệt mới
  async sendNewApprovalRequest(
    recipientEmail: string,
    recipientName: string,
    recordCode: string,
    initiatorName: string,
    stepName: string,
  ) {
    try {
      const templatePath = path.join(
        process.cwd(),
        'src/modules/mailer/templates/new-approval-request.hbs',
      );
      const templateSource = fs.readFileSync(templatePath, 'utf8');

      const template = handlebars.compile(templateSource);
      const htmlToSend = template({
        recipientName,
        recordCode,
        initiatorName,
        stepName,
      });

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
      throw error; // BẮT BUỘC: Ném lỗi ra để BullMQ kích hoạt cơ chế tự động thử lại (Retry) [1]
    }
  }

  // 2. Gửi thông báo phê duyệt quy trình hoàn tất (send-workflow-completed) [1]
  async sendWorkflowCompleted(
    recipientEmail: string,
    recipientName: string,
    recordCode: string,
    status: string,
  ) {
    try {
      await this.transporter.sendMail({
        from: `"BOS Platform" <${process.env.MAIL_FROM || 'no-reply@bos.com'}>`,
        to: recipientEmail,
        subject: `[BOS] Quy trình phê duyệt hoàn tất: ${recordCode}`,
        html: `<h1>Quy trình phê duyệt hoàn tất</h1><p>Chào <b>${recipientName}</b>,</p><p>Hồ sơ đề xuất mang mã số <b>${recordCode}</b> của bạn đã được PHÊ DUYỆT HOÀN TẤT qua tất cả các cấp với trạng thái: <span style="color:green"><b>${status}</b></span>.</p>`,
      });

      this.logger.log(
        `[Email Engine] Đã gửi thư báo hoàn tất quy trình tới: ${recipientEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `[Email Engine] Lỗi gửi thư báo hoàn tất quy trình tới ${recipientEmail}: ${error.message}`,
      );
      throw error; // Ném lỗi để BullMQ kích hoạt Retry [1]
    }
  }

  // 3. Gửi email tùy biến từ Automation Engine (send-dynamic-email) [1]
  async sendDynamicEmail(
    recipientEmail: string,
    subject: string,
    body: string,
    recordData: any,
  ) {
    try {
      const template = handlebars.compile(body);
      const htmlToSend = template({ data: recordData });

      await this.transporter.sendMail({
        from: `"BOS Platform" <${process.env.MAIL_FROM || 'no-reply@bos.com'}>`,
        to: recipientEmail,
        subject: subject,
        html: htmlToSend,
      });

      this.logger.log(
        `[Email Engine] Đã gửi email tùy biến tới: ${recipientEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `[Email Engine] Lỗi khi gửi email tùy biến tới ${recipientEmail}: ${error.message}`,
      );
      throw error; // Ném lỗi để BullMQ kích hoạt Retry [1]
    }
  }

  async sendOtpCode(
    recipientEmail: string,
    recipientName: string,
    otpCode: string,
    actionLabel: string,
  ) {
    try {
      await this.transporter.sendMail({
        from: `"BOS Platform" <${process.env.MAIL_FROM || 'no-reply@bos.com'}>`,
        to: recipientEmail,
        subject: `[BOS] Mã xác thực OTP cho hành động: ${actionLabel}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; color: #333;">
            <h2 style="color: #0050b3; margin-top: 0; border-bottom: 2px solid #0050b3; padding-bottom: 10px;">Xác thực Ký duyệt Hồ sơ</h2>
            <p>Chào <b>${recipientName}</b>,</p>
            <p>Hệ thống ghi nhận bạn đang thực hiện hành động phê duyệt <b>"${actionLabel}"</b> yêu cầu chữ ký số điện tử.</p>
            <p>Mã xác thực OTP của bạn là:</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #0050b3; letter-spacing: 4px; background-color: #f0f5ff; padding: 10px 24px; border-radius: 4px; border: 1px dashed #adc6ff;">
                ${otpCode}
              </span>
            </div>
            <p style="color: #ff4d4f; font-size: 13px;"><b>* Lưu ý:</b> Mã xác thực này có hiệu lực trong vòng <b>2 phút</b> và chỉ sử dụng một lần duy nhất. Vui lòng không tiết lộ mã này cho bất kỳ ai.</p>
            <hr style="border: 0; border-top: 1px solid #f0f0f0; margin: 24px 0;" />
            <p style="font-size: 11px; color: #8c8c8c; text-align: center; margin-bottom: 0;">Đây là thư tự động gửi từ hệ thống BOS Platform. Vui lòng không trả lời thư này.</p>
          </div>
        `,
      });
      this.logger.log(`[Email Engine] Đã gửi mã OTP tới: ${recipientEmail}`);
    } catch (error) {
      this.logger.error(
        `[Email Engine] Lỗi khi gửi mã OTP tới ${recipientEmail}: ${error.message}`,
      );
    }
  }
}
