// File: src/modules/tenants/tenants.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { paginate, PaginateOptions } from '../../prisma/prisma.helper';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Mã doanh nghiệp '${dto.code}' đã được đăng ký trên hệ thống.`,
      );
    }
    return this.prisma.tenant.create({ data: dto });
  }

  async findAll(options: PaginateOptions) {
    return paginate(this.prisma.tenant, {}, options);
  }

  async findOne(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            entities: true,
            records: true,
            workflows: true,
          },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Không tìm thấy doanh nghiệp.');
    return tenant;
  }

  async update(id: number, dto: UpdateTenantDto) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    // Nhờ cấu hình onDelete: Cascade trong schema.prisma, PostgreSQL sẽ tự động xóa sạch
    // toàn bộ tài khoản, tệp đính kèm, biểu mẫu và quy trình của doanh nghiệp này khi bị xóa vĩnh viễn!
    return this.prisma.tenant.delete({ where: { id } });
  }
}
