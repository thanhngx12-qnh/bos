// File: src/modules/attachments/attachments.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { tenantContext } from '../../prisma/tenant-context';

@Injectable()
export class AttachmentsService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private readonly prisma: PrismaService) {
    this.bucketName =
      process.env.R2_BUCKET_NAME || 'bos-enterprise-attachments';

    // Khởi tạo S3 Client kết nối với Cloudflare R2 Cloud
    this.s3Client = new S3Client({
      region: 'auto', // R2 yêu cầu region đặt là 'auto'
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: true, // <-- SỬA LỖI TẠI ĐÂY: Ép buộc SDK sử dụng đúng Endpoint của Cloudflare R2
    });
  }

  // --- HÀM 1: UPLOAD FILE LÊN CLOUD R2 & GHI METADATA VÀO POSTGRES ---
  async uploadFile(
    userId: number,
    file: Express.Multer.File,
    recordId?: number,
  ) {
    if (!file) throw new BadRequestException('Không tìm thấy tệp tin tải lên.');

    const store = tenantContext.getStore();
    const tenantId = store?.tenantId || 0;

    // 1. Kiểm tra Record nếu có truyền recordId
    if (recordId) {
      const record = await this.prisma.record.findUnique({
        where: { id: recordId },
      });
      if (!record)
        throw new NotFoundException('Không tìm thấy bản ghi dữ liệu.');
    }

    // 2. Chống trùng lặp và ghi đè bằng cách băm tên file qua UUIDv4
    const fileExtension = file.originalname.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    // Tạo cấu trúc thư mục sạch sẽ cô lập theo từng Doanh nghiệp (SaaS)
    const s3Key = recordId
      ? `tenant_${tenantId}/record_${recordId}/${uniqueFileName}`
      : `tenant_${tenantId}/static/${uniqueFileName}`;

    try {
      // 3. Đẩy file lên Cloudflare R2 thông qua SDK
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(uploadCommand);

      // 4. Lưu lại Metadata vào PostgreSQL (Prisma Client Extension tự động gán tenantId!)
      return await this.prisma.attachment.create({
        data: {
          recordId: recordId || null,
          fileName: file.originalname,
          s3Key: s3Key,
          mimeType: file.mimetype,
          fileSize: file.size,
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Lỗi tải tệp lên Cloudflare R2: ${error.message}`,
      );
    }
  }

  // --- HÀM 2: LẤY CHI TIẾT FILE ---
  async findOne(id: number) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment)
      throw new NotFoundException('Không tìm thấy tệp tin đính kèm.');
    return attachment;
  }

  // --- HÀM 3: SINH ĐƯỜNG DẪN CÓ CHỮ KÝ SỐ BẢO MẬT (Hiệu lực 15 phút) ---
  async getPresignedUrl(id: number) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment)
      throw new NotFoundException('Không tìm thấy tệp tin đính kèm.');

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: attachment.s3Key,
      });

      // Sinh chữ ký bảo mật giới hạn thời gian (Expires: 900 giây = 15 phút)
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: 900,
      });

      return {
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        presignedUrl: url,
        expiresInSeconds: 900,
      };
    } catch (error) {
      throw new BadRequestException(
        `Lỗi sinh chữ ký bảo mật S3: ${error.message}`,
      );
    }
  }

  // --- HÀM 4: XÓA TỆP TIN ---
  async removeFile(id: number) {
    const attachment = await this.findOne(id);
    return this.prisma.attachment.delete({ where: { id } });
  }
}
