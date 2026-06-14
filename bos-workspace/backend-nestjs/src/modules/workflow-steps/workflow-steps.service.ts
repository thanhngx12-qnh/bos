// File: src/modules/workflow-steps/workflow-steps.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStepDto } from './dto/create-step.dto';
import { CreateTransitionDto } from './dto/create-transition.dto';

@Injectable()
export class WorkflowStepsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- QUẢN LÝ BƯỚC DUYỆT (STEPS) ---
  async createStep(dto: CreateStepDto) {
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: dto.versionId },
    });
    if (!version)
      throw new NotFoundException(
        'Không tìm thấy Phiên bản quy trình (Version).',
      );

    if (version.status !== 'DRAFT') {
      throw new BadRequestException(
        'Chỉ được phép cấu hình bước cho phiên bản đang ở trạng thái DRAFT.',
      );
    }

    // Tự động tính orderIndex nếu không truyền
    let finalOrderIndex = dto.orderIndex;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const lastStep = await this.prisma.workflowStep.findFirst({
        where: { versionId: dto.versionId },
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
      },
    });
  }

  // --- QUẢN LÝ RẼ NHÁNH (TRANSITIONS) ---
  async createTransition(dto: CreateTransitionDto) {
    const fromStep = await this.prisma.workflowStep.findUnique({
      where: { id: dto.fromStepId },
    });
    const toStep = await this.prisma.workflowStep.findUnique({
      where: { id: dto.toStepId },
    });

    if (!fromStep || !toStep)
      throw new NotFoundException('Không tìm thấy Bước nguồn hoặc Bước đích.');
    if (fromStep.versionId !== toStep.versionId) {
      throw new BadRequestException(
        'Không thể tạo rẽ nhánh giữa 2 bước thuộc 2 phiên bản khác nhau.',
      );
    }

    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: fromStep.versionId },
    });
    if (version?.status !== 'DRAFT') {
      throw new BadRequestException(
        'Chỉ được phép cấu hình rẽ nhánh cho phiên bản đang ở trạng thái DRAFT.',
      );
    }

    return this.prisma.workflowTransition.create({
      data: {
        fromStepId: dto.fromStepId,
        toStepId: dto.toStepId,
        conditionLogic: dto.conditionLogic || {},
        autoSkip: dto.autoSkip || false,
      },
    });
  }

  // Lấy toàn bộ Sơ đồ (Pipeline) của 1 Version
  async getPipelineByVersion(versionId: number) {
    return this.prisma.workflowStep.findMany({
      where: { versionId },
      include: {
        transitionsOut: true, // Lấy các đường nối đi ra từ bước này
      },
      orderBy: { orderIndex: 'asc' },
    });
  }
}
