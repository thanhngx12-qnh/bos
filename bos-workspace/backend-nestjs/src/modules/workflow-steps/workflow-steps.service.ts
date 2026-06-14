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

  // --- HÀM TRỢ GIÚP ---
  private async checkVersionIsDraft(versionId: number) {
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: versionId },
    });
    if (!version)
      throw new NotFoundException('Không tìm thấy Phiên bản quy trình.');
    if (version.status !== 'DRAFT') {
      throw new BadRequestException(
        'Chỉ được phép cấu hình (Thêm/Sửa/Xóa) khi phiên bản đang ở trạng thái DRAFT.',
      );
    }
  }

  // ==========================================
  // QUẢN LÝ BƯỚC DUYỆT (STEPS)
  // ==========================================
  async createStep(dto: CreateStepDto) {
    await this.checkVersionIsDraft(dto.versionId);

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

  async updateStep(id: number, dto: UpdateStepDto) {
    const step = await this.prisma.workflowStep.findUnique({ where: { id } });
    if (!step) throw new NotFoundException('Không tìm thấy Bước duyệt.');
    await this.checkVersionIsDraft(step.versionId);

    return this.prisma.workflowStep.update({
      where: { id },
      data: dto,
    });
  }

  async removeStep(id: number) {
    const step = await this.prisma.workflowStep.findUnique({ where: { id } });
    if (!step) throw new NotFoundException('Không tìm thấy Bước duyệt.');
    await this.checkVersionIsDraft(step.versionId);

    // Xóa bước sẽ tự động xóa các đường nối (Transitions) liên quan nhờ onDelete: Cascade nếu có,
    // nhưng để an toàn ta xóa thủ công các Transition trước.
    await this.prisma.workflowTransition.deleteMany({
      where: { OR: [{ fromStepId: id }, { toStepId: id }] },
    });

    return this.prisma.workflowStep.delete({ where: { id } });
  }

  // ==========================================
  // QUẢN LÝ RẼ NHÁNH (TRANSITIONS)
  // ==========================================
  async createTransition(dto: CreateTransitionDto) {
    const fromStep = await this.prisma.workflowStep.findUnique({
      where: { id: dto.fromStepId },
    });
    const toStep = await this.prisma.workflowStep.findUnique({
      where: { id: dto.toStepId },
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
      },
    });
  }

  async updateTransition(id: number, dto: UpdateTransitionDto) {
    const transition = await this.prisma.workflowTransition.findUnique({
      where: { id },
      include: { fromStep: true },
    });
    if (!transition)
      throw new NotFoundException('Không tìm thấy đường rẽ nhánh.');
    await this.checkVersionIsDraft(transition.fromStep.versionId);

    return this.prisma.workflowTransition.update({
      where: { id },
      data: dto,
    });
  }

  async removeTransition(id: number) {
    const transition = await this.prisma.workflowTransition.findUnique({
      where: { id },
      include: { fromStep: true },
    });
    if (!transition)
      throw new NotFoundException('Không tìm thấy đường rẽ nhánh.');
    await this.checkVersionIsDraft(transition.fromStep.versionId);

    return this.prisma.workflowTransition.delete({ where: { id } });
  }

  // ==========================================
  // LẤY SƠ ĐỒ PIPELINE
  // ==========================================
  async getPipelineByVersion(versionId: number) {
    return this.prisma.workflowStep.findMany({
      where: { versionId },
      include: {
        transitionsOut: true, // Lấy các đường nối ĐI RA từ bước này
        transitionsIn: true, // Lấy các đường nối ĐI VÀO bước này
      },
      orderBy: { orderIndex: 'asc' },
    });
  }
}
