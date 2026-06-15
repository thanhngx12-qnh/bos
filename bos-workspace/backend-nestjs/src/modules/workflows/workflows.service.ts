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
import { InjectQueue } from '@nestjs/bullmq'; // <-- IMPORT THƯ VIỆN ĐẨY QUENE
import { Queue } from 'bullmq'; // <-- IMPORT THƯ VIỆN HÀNG ĐỢI

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('webhook-queue') private readonly webhookQueue: Queue, // <-- INJECT HÀNG ĐỢI WEBHOOK LÕI
  ) {}

  // --- HÀM TRỢ GIÚP: ĐÁNH GIÁ ĐIỀU KIỆN RẼ NHÁNH ---
  private evaluateTransitionCondition(logic: any, recordData: any): boolean {
    const rules = logic?.rules;
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

  // ====================================================
  // BỘ LỌC TẦM NHÌN QUY TRÌNH (VISIBILITY FILTER ENGINE)
  // ====================================================
  async findAll(currentUser: any) {
    const workflows = await this.prisma.workflow.findMany({
      include: {
        entity: { select: { id: true, name: true, code: true } },
        versions: { orderBy: { version: 'desc' } },
      },
      orderBy: { id: 'desc' },
    });

    return workflows.filter((wf) => {
      const visibility: any = wf.visibility || {};

      if (
        visibility.allowAll === true ||
        Object.keys(visibility).length === 0
      ) {
        return true;
      }

      if (
        visibility.allowedUserTypes &&
        Array.isArray(visibility.allowedUserTypes)
      ) {
        if (!visibility.allowedUserTypes.includes(currentUser.userType)) {
          return false;
        }
      }

      const isAllowedDept =
        currentUser.departmentId &&
        visibility.allowedDepartments?.includes(currentUser.departmentId);
      const isAllowedRole =
        currentUser.roleId &&
        visibility.allowedRoles?.includes(currentUser.roleId);
      const isAllowedUser = visibility.allowedUsers?.includes(
        currentUser.userId,
      );

      return isAllowedDept || isAllowedRole || isAllowedUser;
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

  // ====================================================
  // BẢN NÂNG CẤP HOÀN HẢO: HÀM LÕI PHÊ DUYỆT TÍCH HỢP HÀNG ĐỢI WEBHOOK NGẦM
  // ====================================================
  async handleAction(
    instanceId: number,
    userId: number,
    dto: WorkflowActionDto,
  ) {
    // 1. Chạy Transaction cô lập dòng dữ liệu và phê duyệt
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        `SELECT id FROM workflow_instances WHERE id = $1 FOR UPDATE`,
        instanceId,
      );

      const instance = await tx.workflowInstance.findUnique({
        where: { id: instanceId },
        include: {
          record: true,
          version: {
            include: {
              steps: true,
              workflow: { select: { name: true } }, // Lấy thêm tên quy trình để bắn webhook
            },
          },
        },
      });

      if (!instance)
        throw new NotFoundException('Không tìm thấy lượt chạy quy trình.');

      if (instance.status !== 'IN_PROGRESS') {
        throw new BadRequestException(
          'Lượt chạy quy trình này đã kết thúc hoặc đang được xử lý bởi thành viên khác.',
        );
      }

      const transition = await tx.workflowTransition.findUnique({
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

      const stepConfig: any = currentStepObj.permissions || {};
      const approverType = stepConfig.approverType || 'SINGLE';
      const candidateUsers = stepConfig.candidateUsers || [];

      if (candidateUsers.length > 0 && !candidateUsers.includes(userId)) {
        throw new BadRequestException(
          'Tài khoản của bạn không được phân quyền thực hiện hành động tại bước này.',
        );
      }

      const transLogic: any = transition.conditionLogic || {};
      const actionLabel = transLogic.actionLabel || 'Phê duyệt';
      const requiresSignature = transLogic.requiresSignature || false;

      if (requiresSignature && !dto.signatureData) {
        throw new BadRequestException(
          `Nút bấm '${actionLabel}' yêu cầu bạn phải thực hiện Chữ ký điện tử.`,
        );
      }

      await tx.workflowLog.create({
        data: {
          instanceId,
          stepId: instance.currentStep,
          userId,
          action: actionLabel,
          comment: dto.comment || `Đã thực hiện hành động: ${actionLabel}`,
          snapshot: dto.signatureData
            ? ({ signature: dto.signatureData } as any)
            : undefined,
        },
      });

      let shouldTransition = true;

      if (approverType === 'ALL_OF' && candidateUsers.length > 1) {
        const approvedLogs = await tx.workflowLog.findMany({
          where: {
            instanceId,
            stepId: instance.currentStep,
            action: actionLabel,
          },
        });

        const approvedUserIds = approvedLogs.map((l) => l.userId);

        const allApproved = candidateUsers.every((uid) =>
          approvedUserIds.includes(uid),
        );

        if (!allApproved) {
          shouldTransition = false;
        }
      }

      let finalStatus = 'IN_PROGRESS';
      let nextStepId: number | null = transition.toStepId;

      if (shouldTransition) {
        if (nextStepObj.stepType === 'SYSTEM_TASK' || transition.autoSkip) {
          finalStatus = 'COMPLETED';
        }

        await tx.workflowInstance.update({
          where: { id: instanceId },
          data: {
            currentStep: nextStepId,
            status: finalStatus,
          },
        });
      }

      // Đóng gói dữ liệu sạch để chuyển tiếp ra môi trường bất đồng bộ ngoài Transaction
      return {
        instanceId,
        isCompleted: shouldTransition && finalStatus === 'COMPLETED',
        recordData: instance.record.data,
        workflowName: instance.version.workflow.name,
        actionExecuted: actionLabel,
      };
    });

    // --- 2. KÍCH HOẠT HÀNG ĐỢI WEBHOOK BẤT ĐỒNG BỘ (BULLMQ) ---
    // Tuyệt đối không gọi HTTP API bên trong Database Transaction tránh treo tài nguyên DB
    if (result.isCompleted) {
      // Giả lập webhook nhận cấu hình từ quy trình. Hiện tại để test, ta trỏ về một Mock Webhook Endpoint
      const testWebhookUrl =
        'https://webhook.site/26330559-6798-4c8d-afae-03b8600f9ba9';

      try {
        await this.webhookQueue.add(
          'send-webhook', // Tên job
          {
            instanceId: result.instanceId,
            webhookUrl: testWebhookUrl,
            payload: {
              event: 'WORKFLOW_COMPLETED',
              workflowName: result.workflowName,
              instanceId: result.instanceId,
              recordData: result.recordData,
              timestamp: new Date().toISOString(),
            },
          },
          {
            attempts: 3, // Thử lại tối đa 3 lần nếu máy chủ đích bị lỗi/timeout
            backoff: { type: 'exponential', delay: 2000 }, // Trì hoãn luỹ thừa tăng dần (2s, 4s, 8s) để tránh spam
          },
        );
        console.log(
          `[Webhook Queue] Da xep hang tac vu ban Webhook cho Instance ID: ${result.instanceId}`,
        );
      } catch (error) {
        console.error(
          `[Webhook Queue] Loi khong the dua Job vao Redis: ${error.message}`,
        );
      }
    }

    // Lấy lại thông tin instance mới nhất để trả về cho Client hiển thị UI
    const updatedInstance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    return {
      ...updatedInstance,
      transitioned: result.isCompleted,
      actionExecuted: result.actionExecuted,
    };
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
