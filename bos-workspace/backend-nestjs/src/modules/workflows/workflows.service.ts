// File: src/modules/workflows/workflows.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { WorkflowActionDto } from './dto/workflow-action.dto';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- 1. HÀM TRỢ GIÚP: ĐÁNH GIÁ ĐIỀU KIỆN RẼ NHÁNH ---
  private evaluateTransitionCondition(logic: any, recordData: any): boolean {
    // Nếu đường nối không có điều kiện -> Luôn đúng (Mặc định đi đường này)
    if (!logic || !logic.field) return true;

    const actualVal = recordData[logic.field];
    const targetVal = logic.value;

    switch (logic.operator) {
      case '==':
        return actualVal === targetVal;
      case '!=':
        return actualVal !== targetVal;
      case '>':
        return Number(actualVal) > Number(targetVal);
      case '<':
        return Number(actualVal) < Number(targetVal);
      case '>=':
        return Number(actualVal) >= Number(targetVal);
      case '<=':
        return Number(actualVal) <= Number(targetVal);
      default:
        return false;
    }
  }

  // --- 2. CÁC API CŨ VẪN GIỮ NGUYÊN ---
  async create(dto: CreateWorkflowDto) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
    });
    if (!entity)
      throw new NotFoundException('Không tìm thấy Biểu mẫu (Entity).');

    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          entityId: dto.entityId,
          name: dto.name,
          description: dto.description,
        },
      });

      const version = await tx.workflowVersion.create({
        data: {
          workflowId: workflow.id,
          version: 1,
          status: 'DRAFT',
        },
      });

      return { ...workflow, versions: [version] };
    });
  }

  async findAll() {
    return this.prisma.workflow.findMany({
      include: {
        entity: { select: { id: true, name: true, code: true } },
        versions: { orderBy: { version: 'desc' } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        versions: {
          include: { steps: true },
          orderBy: { version: 'desc' },
        },
      },
    });
    if (!workflow) throw new NotFoundException('Không tìm thấy Quy trình.');
    return workflow;
  }

  async update(id: number, dto: UpdateWorkflowDto) {
    await this.findOne(id);
    return this.prisma.workflow.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    const hasInstances = await this.prisma.workflowInstance.findFirst({
      where: { version: { workflowId: id } },
    });
    if (hasInstances) {
      throw new BadRequestException(
        'Không thể xóa: Quy trình này đã phát sinh các lượt chạy trong thực tế.',
      );
    }
    return this.prisma.workflow.delete({ where: { id } });
  }

  async cloneVersion(workflowId: number, sourceVersionId: number) {
    const workflow = await this.findOne(workflowId);
    const sourceVersion = await this.prisma.workflowVersion.findUnique({
      where: { id: sourceVersionId },
      include: { steps: true },
    });

    if (!sourceVersion || sourceVersion.workflowId !== workflowId) {
      throw new BadRequestException('Phiên bản nguồn không hợp lệ.');
    }

    const maxVersion = workflow.versions.reduce(
      (max, v) => (v.version > max ? v.version : max),
      0,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Tạo vỏ Version mới
      const newVersion = await tx.workflowVersion.create({
        data: {
          workflowId,
          version: maxVersion + 1,
          status: 'DRAFT',
        },
      });

      // 2. Nhân bản toàn bộ các bước (Steps) của version cũ sang version mới
      for (const step of sourceVersion.steps) {
        await tx.workflowStep.create({
          data: {
            versionId: newVersion.id,
            name: step.name,
            stepType: step.stepType,
            permissions: step.permissions || {},
            orderIndex: step.orderIndex,
          },
        });
      }

      return newVersion;
    });
  }

  async updateVersionStatus(
    workflowId: number,
    versionId: number,
    status: string,
  ) {
    const validStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Trạng thái không hợp lệ.');
    }

    if (status === 'PUBLISHED') {
      await this.prisma.workflowVersion.updateMany({
        where: { workflowId, status: 'PUBLISHED' },
        data: { status: 'ARCHIVED' },
      });
    }

    return this.prisma.workflowVersion.update({
      where: { id: versionId, workflowId },
      data: { status },
    });
  }

  // ====================================================
  // 3. ĐỘNG CƠ THỰC THI QUY TRÌNH (STATE MACHINE ENGINE)
  // ====================================================

  // --- KHỞI CHẠY QUY TRÌNH (SUBMIT PHIẾU) ---
  async startInstance(userId: number, dto: CreateInstanceDto) {
    const record = await this.prisma.record.findUnique({
      where: { id: dto.recordId },
    });
    if (!record) throw new NotFoundException('Không tìm thấy Bản ghi dữ liệu.');

    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: dto.versionId },
      include: { steps: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!version)
      throw new NotFoundException('Không tìm thấy Phiên bản quy trình.');
    if (version.steps.length === 0) {
      throw new BadRequestException(
        'Phiên bản quy trình này chưa được cấu hình bước duyệt nào.',
      );
    }

    // Kiểm tra xem phiếu này đã chạy quy trình nào đang dang dở chưa
    const activeInstance = await this.prisma.workflowInstance.findFirst({
      where: { recordId: dto.recordId, status: 'IN_PROGRESS' },
    });
    if (activeInstance) {
      throw new BadRequestException(
        'Bản ghi này đang nằm trong một luồng quy trình đang chạy.',
      );
    }

    const firstStep = version.steps[0]; // Trạm đầu tiên (orderIndex nhỏ nhất)

    return this.prisma.$transaction(async (tx) => {
      const instance = await tx.workflowInstance.create({
        data: {
          versionId: dto.versionId,
          recordId: dto.recordId,
          currentStep: firstStep.id,
          status: 'IN_PROGRESS',
        },
      });

      // Tạo Audit Log ghi nhận hành động trình ký
      await tx.workflowLog.create({
        data: {
          instanceId: instance.id,
          stepId: firstStep.id,
          userId,
          action: 'START',
          comment: 'Khởi chạy luồng quy trình phê duyệt.',
        },
      });

      return instance;
    });
  }

  // --- XỬ LÝ DUYỆT / TỪ CHỐI (APPROVE / REJECT) ---
  async handleAction(
    instanceId: number,
    userId: number,
    dto: WorkflowActionDto,
  ) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        record: true,
        version: {
          include: {
            steps: {
              include: {
                transitionsOut: true, // Lấy các đường rẽ nhánh đi ra từ bước hiện tại
              },
            },
          },
        },
      },
    });

    if (!instance)
      throw new NotFoundException('Không tìm thấy lượt chạy quy trình.');
    if (instance.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Lượt chạy quy trình này đã kết thúc hoặc bị hủy.',
      );
    }

    const currentStepObj = instance.version.steps.find(
      (s) => s.id === instance.currentStep,
    );
    if (!currentStepObj)
      throw new NotFoundException('Không tìm thấy bước duyệt hiện tại.');

    // TRƯỜNG HỢP 1: TỪ CHỐI (REJECT) -> Bẻ gãy quy trình lập tức
    if (dto.action === 'REJECT') {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.workflowInstance.update({
          where: { id: instanceId },
          data: { status: 'REJECTED' },
        });

        await tx.workflowLog.create({
          data: {
            instanceId,
            stepId: instance.currentStep,
            userId,
            action: 'REJECT',
            comment: dto.comment || 'Từ chối phê duyệt quy trình.',
          },
        });

        return updated;
      });
    }

    // TRƯỜNG HỢP 2: PHÊ DUYỆT (APPROVE) -> Kích hoạt Rule Engine
    const recordData = instance.record.data as any;
    const transitions = currentStepObj.transitionsOut;
    let nextStepId: number | null = null;
    let isAutoSkip = false;

    // Duyệt qua các đường rẽ nhánh của bước hiện tại để tìm đường đi hợp lệ đầu tiên
    for (const trans of transitions) {
      const isMatch = this.evaluateTransitionCondition(
        trans.conditionLogic,
        recordData,
      );
      if (isMatch) {
        nextStepId = trans.toStepId;
        isAutoSkip = trans.autoSkip;
        break; // Tìm thấy đường đi thỏa mãn -> Thoát vòng lặp
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let finalStatus = 'IN_PROGRESS';
      let commentLog = dto.comment || 'Đã phê duyệt.';

      if (!nextStepId) {
        // Nếu không tìm thấy đường đi tiếp theo -> Đã là bước cuối cùng -> Hoàn thành luồng!
        finalStatus = 'COMPLETED';
        nextStepId = instance.currentStep; // Giữ nguyên ID bước cuối
      } else {
        // Kiểm tra xem bước tiếp theo có phải SYSTEM_TASK hoặc được bật AutoSkip không
        const nextStepObj = instance.version.steps.find(
          (s) => s.id === nextStepId,
        );
        if (nextStepObj?.stepType === 'SYSTEM_TASK' || isAutoSkip) {
          finalStatus = 'COMPLETED'; // Chuyển thẳng trạng thái về Hoàn thành
          commentLog += ` (Hệ thống tự động chuyển tiếp và hoàn thành qua trạm: ${nextStepObj?.name})`;
        }
      }

      const updated = await tx.workflowInstance.update({
        where: { id: instanceId },
        data: {
          currentStep: nextStepId,
          status: finalStatus,
        },
      });

      // Ghi Audit Log lưu vết
      await tx.workflowLog.create({
        data: {
          instanceId,
          stepId: instance.currentStep,
          userId,
          action: 'APPROVE',
          comment: commentLog,
        },
      });

      return updated;
    });
  }

  // Lấy lịch sử Audit Log của 1 lượt chạy (Cho Ban Giám Đốc xem)
  async getInstanceLogs(instanceId: number) {
    return this.prisma.workflowLog.findMany({
      where: { instanceId },
      include: {
        step: { select: { name: true } },
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' }, // Ghi nhận theo tiến trình thời gian
    });
  }
}
