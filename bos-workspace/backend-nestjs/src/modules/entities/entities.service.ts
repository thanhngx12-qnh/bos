// File: src/modules/entities/entities.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { RedisService } from '../redis/redis.service'; // <-- Import Redis
import { tenantContext } from '../../prisma/tenant-context'; // <-- Import Context
import { paginate, PaginateOptions } from '../../prisma/prisma.helper';

@Injectable()
export class EntitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService, // <-- Inject Redis Service
  ) {}

  // Hàm nội bộ tạo khóa Cache phân tách theo từng Doanh nghiệp
  private getCacheKey(entityId: number): string {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId || 0;
    return `tenant:${tenantId}:entity:${entityId}`;
  }

  // HOÀN TRẢ HÀM CREATE VỀ NGUYÊN BẢN CHUẨN XÁC:
  async create(dto: CreateEntityDto) {
    const existing = await this.prisma.entity.findUnique({
      where: { code: dto.code },
    });
    if (existing)
      throw new ConflictException(`Thực thể ${dto.code} đã tồn tại.`);
    return this.prisma.entity.create({ data: dto });
  }

  async findAll(options: PaginateOptions) {
    return paginate(this.prisma.entity, {}, options);
  }

  // --- ĐỌC CACHE: Tốc độ < 1ms, bảo vệ PostgreSQL ---
  async findOne(id: number) {
    const cacheKey = this.getCacheKey(id);

    // 1. Thử lấy dữ liệu từ Redis Cache trước
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      console.log(
        `[REDIS CACHE HIT] Lay Entity ID ${id} tu bo nho dem Redis sieu toc.`,
      );
      return JSON.parse(cachedData);
    }

    console.log(
      `[REDIS CACHE MISS] Choc xuong PostgreSQL de lay Entity ID ${id}.`,
    );

    // 2. Nếu không có trong cache, truy vấn PostgreSQL
    const entity = await this.prisma.entity.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { orderIndex: 'asc' } },
        workflows: { include: { versions: true } },
        printTemplates: true,
      },
    });
    if (!entity) throw new NotFoundException('Không tìm thấy thực thể.');

    // 3. Ghi lại dữ liệu sạch vào Redis Cache (Lưu giữ trong 1 giờ - 3600 giây)
    await this.redis.set(cacheKey, JSON.stringify(entity), 3600);

    return entity;
  }

  // --- XÓA CACHE (Cache Invalidation) khi sửa ---
  async update(id: number, dto: UpdateEntityDto) {
    const current = await this.findOne(id);

    if (dto.code && dto.code !== current.code) {
      throw new BadRequestException(
        'Không được phép thay đổi mã định danh (Code) sau khi đã khởi tạo.',
      );
    }

    const updated = await this.prisma.entity.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        autoCodePattern: dto.autoCodePattern,
      },
    });

    // XÓA CACHE
    const cacheKey = this.getCacheKey(id);
    await this.redis.del(cacheKey);
    console.log(
      `[REDIS CACHE INVALIDATE] Da xoa Cache cho Entity ID ${id} vi thong tin thay doi.`,
    );

    return updated;
  }

  // --- XÓA CACHE khi xóa thực thể ---
  async remove(id: number) {
    await this.findOne(id);

    const hasRecords = await this.prisma.record.findFirst({
      where: { entityId: id },
    });
    if (hasRecords) {
      throw new BadRequestException(
        'Không thể xóa: Thực thể đã phát sinh dữ liệu vận hành.',
      );
    }

    const deleted = await this.prisma.entity.delete({ where: { id } });

    // XÓA CACHE
    const cacheKey = this.getCacheKey(id);
    await this.redis.del(cacheKey);
    console.log(
      `[REDIS CACHE INVALIDATE] Da xoa Cache cho Entity ID ${id} do thuc the bi xoa.`,
    );

    return deleted;
  }
}
