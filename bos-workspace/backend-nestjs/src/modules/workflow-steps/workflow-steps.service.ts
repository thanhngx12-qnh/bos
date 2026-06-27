// File: src/modules/workflow-steps/workflow-steps.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { CreateTransitionDto } from './dto/create-transition.dto';
import { UpdateTransitionDto } from './dto/update-transition.dto';

@Injectable()
export class WorkflowStepsService {
  constructor(private readonly prisma: PrismaService) {}

  private async checkVersionIsDraft(versionId: number) {
    const version = await this.prisma.workflowVersion.findFirst({
      where: { id: versionId } as any, // SỬA LỖI: as any
    });
    if (!version)
      throw new NotFoundException('Không tìm thấy Phiên bản quy trình.');
    if (version.status !== 'DRAFT') {
      throw new BadRequestException(
        'Chỉ được phép cấu hình (Thêm/Sửa/Xóa) khi phiên bản đang ở trạng thái DRAFT.',
      );
    }
  }

  async createStep(dto: CreateStepDto) {
    await this.checkVersionIsDraft(dto.versionId);

    let finalOrderIndex = dto.orderIndex;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const lastStep = await this.prisma.workflowStep.findFirst({
        where: { versionId: dto.versionId } as any, // SỬA LỖI: as any
        orderBy: { orderIndex: 'desc' },
      });
      finalOrderIndex = lastStep ? lastStep.orderIndex + 1 : 1;
    }

    return this.prisma.workflowStep.create({
      data: {
        versionId: dto.versionId,
        name: dto.name,
        stepType: dto.stepType || 'USER_TASK',
        permissions: dto.permissions || {},
        orderIndex: finalOrderIndex,
      } as any, // SỬA LỖI: as any
    });
  }

  async updateStep(id: number, dto: UpdateStepDto) {
    const step = await this.prisma.workflowStep.findFirst({
      where: { id } as any,
    }); // SỬA LỖI: as any
    if (!step) throw new NotFoundException('Không tìm thấy Bước duyệt.');
    await this.checkVersionIsDraft(step.versionId);

    return this.prisma.workflowStep.update({
      where: { id } as any, // SỬA LỖI: as any
      data: dto as any, // SỬA LỖI: as any
    });
  }

  async removeStep(id: number) {
    const step = await this.prisma.workflowStep.findFirst({
      where: { id } as any,
    }); // SỬA LỖI: as any
    if (!step) throw new NotFoundException('Không tìm thấy Bước duyệt.');
    await this.checkVersionIsDraft(step.versionId);

    await this.prisma.workflowTransition.deleteMany({
      where: { OR: [{ fromStepId: id }, { toStepId: id }] } as any, // SỬA LỖI: as any
    });

    return this.prisma.workflowStep.delete({ where: { id } as any }); // SỬA LỖI: as any
  }

  async createTransition(dto: CreateTransitionDto) {
    const fromStep = await this.prisma.workflowStep.findFirst({
      where: { id: dto.fromStepId } as any, // SỬA LỖI: as any
    });
    const toStep = await this.prisma.workflowStep.findFirst({
      where: { id: dto.toStepId } as any, // SỬA LỖI: as any
    });

    if (!fromStep || !toStep)
      throw new NotFoundException('Không tìm thấy Bước nguồn hoặc đích.');
    if (fromStep.versionId !== toStep.versionId) {
      throw new BadRequestException(
        'Không thể nối 2 bước thuộc 2 phiên bản khác nhau.',
      );
    }

    await this.checkVersionIsDraft(fromStep.versionId);

    return this.prisma.workflowTransition.create({
      data: {
        fromStepId: dto.fromStepId,
        toStepId: dto.toStepId,
        conditionLogic: dto.conditionLogic || {},
        autoSkip: dto.autoSkip || false,
      } as any, // SỬA LỖI: as any
    });
  }

  async updateTransition(id: number, dto: UpdateTransitionDto) {
    const transition = await this.prisma.workflowTransition.findFirst({
      where: { id } as any, // SỬA LỖI: as any
      include: { fromStep: true },
    });
    if (!transition)
      throw new NotFoundException('Không tìm thấy đường rẽ nhánh.');
    await this.checkVersionIsDraft(transition.fromStep.versionId);

    return this.prisma.workflowTransition.update({
      where: { id } as any, // SỬA LỖI: as any
      data: dto as any, // SỬA LỖI: as any
    });
  }

  async removeTransition(id: number) {
    const transition = await this.prisma.workflowTransition.findFirst({
      where: { id } as any, // SỬA LỖI: as any
      include: { fromStep: true },
    });
    if (!transition)
      throw new NotFoundException('Không tìm thấy đường rẽ nhánh.');
    await this.checkVersionIsDraft(transition.fromStep.versionId);

    return this.prisma.workflowTransition.delete({ where: { id } as any }); // SỬA LỖI: as any
  }

  async getPipelineByVersion(versionId: number) {
    return this.prisma.workflowStep.findMany({
      where: { versionId } as any, // SỬA LỖI: as any
      include: {
        transitionsOut: true,
        transitionsIn: true,
      } as any, // SỬA LỖI: as any
      orderBy: { orderIndex: 'asc' },
    });
  }

  async getStepCandidates(stepId: number, tenantId: number) {
    const step = await this.prisma.workflowStep.findUnique({
      where: { id: stepId } as any,
    });
    if (!step) throw new NotFoundException('Không tìm thấy Bước duyệt.');

    const permissions: any = step.permissions || {};
    const candidateUsers: number[] = permissions.candidateUsers || [];
    const candidateRoles: number[] = permissions.candidateRoles || [];
    const candidateDepts: number[] = permissions.candidateDepts || [];

    // Nếu không có cấu hình ứng viên nào, trả về mảng rỗng
    if (
      candidateUsers.length === 0 &&
      candidateRoles.length === 0 &&
      candidateDepts.length === 0
    ) {
      return [];
    }

    // Truy vấn tất cả Active Users khớp với danh sách ứng viên
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        OR: [
          { id: { in: candidateUsers } },
          { roleId: { in: candidateRoles } },
          { departmentId: { in: candidateDepts } },
        ] as any,
      } as any,
      select: {
        id: true,
        fullName: true,
        email: true,
      },
    });

    return users;
  }
}
