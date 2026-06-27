// File: src/modules/users/user-delegations.service.ts
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';

@Injectable()
export class UserDelegationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: number, fromUserId: number) {
    return this.prisma.approvalDelegation.findMany({
      where: { tenantId, fromUserId } as any,
      include: {
        toUser: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
      orderBy: { id: 'desc' } as any,
    });
  }

  async create(tenantId: number, fromUserId: number, dto: CreateDelegationDto) {
    if (fromUserId === dto.toUserId) {
      throw new BadRequestException('Không thể tự ủy quyền cho chính mình.');
    }

    // 1. Kiểm tra toUserId có tồn tại trong cùng Tenant
    const targetUser = await this.prisma.user.findFirst({
      where: { id: dto.toUserId, tenantId } as any,
    });
    if (!targetUser) {
      throw new NotFoundException('Không tìm thấy người nhận ủy quyền trong doanh nghiệp.');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start > end) {
      throw new BadRequestException('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
    }

    // 2. Kiểm tra xem đã có cấu hình trùng lặp từ trước
    const existing = await this.prisma.approvalDelegation.findFirst({
      where: {
        tenantId,
        fromUserId,
        toUserId: dto.toUserId,
        startDate: start,
        endDate: end,
      } as any,
    });
    if (existing) {
      throw new ConflictException('Cấu hình ủy quyền này đã tồn tại.');
    }

    return this.prisma.approvalDelegation.create({
      data: {
        tenantId,
        fromUserId,
        toUserId: dto.toUserId,
        startDate: start,
        endDate: end,
        isActive: true,
      } as any,
    });
  }

  async update(tenantId: number, fromUserId: number, id: number, isActive: boolean) {
    const delegation = await this.prisma.approvalDelegation.findFirst({
      where: { id, tenantId, fromUserId } as any,
    });
    if (!delegation) {
      throw new NotFoundException('Không tìm thấy cấu hình ủy quyền yêu cầu.');
    }

    return this.prisma.approvalDelegation.update({
      where: { id } as any,
      data: { isActive } as any,
    });
  }

  async remove(tenantId: number, fromUserId: number, id: number) {
    const delegation = await this.prisma.approvalDelegation.findFirst({
      where: { id, tenantId, fromUserId } as any,
    });
    if (!delegation) {
      throw new NotFoundException('Không tìm thấy cấu hình ủy quyền yêu cầu.');
    }

    await this.prisma.approvalDelegation.delete({
      where: { id } as any,
    });
    return { success: true };
  }
}
