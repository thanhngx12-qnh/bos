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

  // --- HÀM TRỢ GIÚP: ĐÁNH GIÁ ĐIỀU KIỆN RẼ NHÁNH ---
  private evaluateTransitionCondition(logic: any, recordData: any): boolean {
    const rules = logic?.rules;
    // Nếu rẽ nhánh không cấu hình logic rẽ nhánh cụ thể -> Mặc định coi là thỏa mãn điều kiện
    if (!rules || !rules.field) return true;

    const actualVal = recordData[rules.field];
    const targetVal = rules.value;

    switch (rules.operator) {
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

  // --- CÁC API CƠ BẢN ---
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
      const newVersion = await tx.workflowVersion.create({
        data: {
          workflowId,
          version: maxVersion + 1,
          status: 'DRAFT',
        },
      });

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

  // --- KHỞI CHẠY QUY TRÌNH ---
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

    const activeInstance = await this.prisma.workflowInstance.findFirst({
      where: { recordId: dto.recordId, status: 'IN_PROGRESS' },
    });
    if (activeInstance) {
      throw new BadRequestException(
        'Bản ghi này đang nằm trong một luồng quy trình đang chạy.',
      );
    }

    const firstStep = version.steps[0];

    return this.prisma.$transaction(async (tx) => {
      const instance = await tx.workflowInstance.create({
        data: {
          versionId: dto.versionId,
          recordId: dto.recordId,
          currentStep: firstStep.id,
          status: 'IN_PROGRESS',
        },
      });

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

  // ==========================================
  // HÀM LÕI: XỬ LÝ PHÊ DUYỆT ĐA HÌNH & SONG SONG
  // ==========================================
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
            steps: true,
          },
        },
      },
    });

    if (!instance)
      throw new NotFoundException('Không tìm thấy lượt chạy quy trình.');
    if (instance.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Lượt chạy quy trình này đã kết thúc.');
    }

    // 1. Tìm thông tin đường rẽ nhánh (Transition / Nút bấm động) mà người dùng kích hoạt
    const transition = await this.prisma.workflowTransition.findUnique({
      where: { id: dto.transitionId },
      include: { fromStep: true, toStep: true },
    });

    if (!transition)
      throw new NotFoundException(
        'Không tìm thấy đường nối quy trình (Nút bấm).',
      );
    if (transition.fromStepId !== instance.currentStep) {
      throw new BadRequestException(
        'Đường nối không thuộc về bước duyệt hiện tại của phiếu.',
      );
    }

    const currentStepObj = transition.fromStep;
    const nextStepObj = transition.toStep;

    // Đọc cấu hình phê duyệt của bước hiện tại (permissions JSONB)
    const stepConfig: any = currentStepObj.permissions || {};
    const approverType = stepConfig.approverType || 'SINGLE'; // Chế độ duyệt: SINGLE, ALL_OF (Đồng thuận), ANY_OF (Đại diện)
    const candidateUsers = stepConfig.candidateUsers || []; // Danh sách ID người được duyệt tại trạm này

    // Kiểm tra quyền: Nếu có cấu hình danh sách người duyệt cụ thể, tài khoản thực thi phải nằm trong danh sách
    if (candidateUsers.length > 0 && !candidateUsers.includes(userId)) {
      throw new BadRequestException(
        'Tài khoản của bạn không được phân quyền thực hiện hành động tại bước này.',
      );
    }

    // Đọc cấu hình Nút bấm động được lưu trong logic rẽ nhánh (conditionLogic JSONB)
    const transLogic: any = transition.conditionLogic || {};
    const actionLabel = transLogic.actionLabel || 'Phê duyệt'; // Tên nút bấm động (VD: "Đồng ý chuyển tiếp", "Ký duyệt")
    const requiresSignature = transLogic.requiresSignature || false; // Nút này có bắt buộc ký tên không

    if (requiresSignature && !dto.signatureData) {
      throw new BadRequestException(
        `Nút bấm '${actionLabel}' yêu cầu bạn phải thực hiện Chữ ký điện tử.`,
      );
    }

    // 2. Chạy cơ chế Phê duyệt song song / Đồng thuận trong Transaction
    return this.prisma.$transaction(async (tx) => {
      // Lưu lại vết phê duyệt hiện tại vào Audit Log trước
      // Ghi nhận lượt duyệt hiện tại vào Audit Log trước
      await tx.workflowLog.create({
        data: {
          instanceId,
          stepId: instance.currentStep,
          userId,
          action: actionLabel, // Lưu đúng tên nút bấm động
          comment: dto.comment || `Đã thực hiện hành động: ${actionLabel}`,
          snapshot: dto.signatureData
            ? ({ signature: dto.signatureData } as any)
            : undefined, // <-- SỬA LỖI TẠI ĐÂY
        },
      });

      let shouldTransition = true;

      // XỬ LÝ DUYỆT ĐỒNG THUẬN SONG SONG (ALL_OF)
      if (approverType === 'ALL_OF' && candidateUsers.length > 1) {
        // Đếm xem trong lịch sử duyệt của bước hiện tại, đã có bao nhiêu người trong nhóm duyệt rồi
        const approvedLogs = await tx.workflowLog.findMany({
          where: {
            instanceId,
            stepId: instance.currentStep,
            action: actionLabel,
          },
        });

        const approvedUserIds = approvedLogs.map((l) => l.userId);

        // Kiểm tra xem tất cả những người được giao nhiệm vụ duyệt (candidateUsers) đã thực thi đầy đủ chưa
        const allApproved = candidateUsers.every((uid) =>
          approvedUserIds.includes(uid),
        );

        if (!allApproved) {
          shouldTransition = false; // Chưa đủ người đồng thuận -> Phiếu vẫn giữ nguyên tại trạm cũ!
        }
      }

      // 3. Nếu đủ điều kiện chuyển trạm -> Thực hiện chuyển dịch trạng thái
      if (shouldTransition) {
        let finalStatus = 'IN_PROGRESS';
        let nextStepId: number | null = transition.toStepId;

        // Nếu trạm tiếp theo là SYSTEM_TASK (Tự động hoàn thành) hoặc đường nối bật AutoSkip -> Hoàn thành luồng luôn
        if (nextStepObj.stepType === 'SYSTEM_TASK' || transition.autoSkip) {
          finalStatus = 'COMPLETED';
        }

        const updated = await tx.workflowInstance.update({
          where: { id: instanceId },
          data: {
            currentStep: nextStepId,
            status: finalStatus,
          },
        });

        return { ...updated, transitioned: true, actionExecuted: actionLabel };
      }

      // Trả về thông báo phiếu vẫn ở trạm cũ chờ đồng thuận
      return {
        ...instance,
        transitioned: false,
        actionExecuted: actionLabel,
        message:
          'Lượt phê duyệt đã được ghi nhận. Hệ thống đang chờ các thành viên khác phê duyệt đồng thuận để chuyển trạm.',
      };
    });
  }

  async getInstanceLogs(instanceId: number) {
    return this.prisma.workflowLog.findMany({
      where: { instanceId },
      include: {
        step: { select: { name: true } },
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
