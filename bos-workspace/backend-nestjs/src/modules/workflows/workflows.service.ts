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
import { NotificationsService } from '../notifications/notifications.service'; // <-- IMPORT DỊCH VỤ THÔNG BÁO
import { paginate, PaginateOptions } from '../../prisma/prisma.helper';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService, // <-- INJECT DỊCH VỤ THÔNG BÁO LÕI
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
  // BỘ LỌC TẦM NHÌN QUY TRÌNH (DATABASE-LEVEL VISIBILITY FILTER)
  // Tích hợp phân trang, lọc chéo JSONB dưới Postgres cực nhanh
  // ====================================================
  async findAll(currentUser: any, options: PaginateOptions) {
    const whereClause: any = {
      // Prisma Client Extension sẽ tự động ghim thêm tenantId cô lập tại đây!
      OR: [
        // Kịch bản 1: Cho phép tất cả xem (allowAll: true) hoặc chưa cấu hình tầm nhìn
        { visibility: { path: ['allowAll'], equals: true } },
        { visibility: { equals: {} } },

        // Kịch bản 2: Lọc nghiêm ngặt theo loại tài khoản (allowedUserTypes chứa INTERNAL/EXTERNAL)
        {
          visibility: {
            path: ['allowedUserTypes'],
            array_contains: currentUser.userType,
          },
        },

        // Kịch bản 3: Kiểm tra khớp chéo theo Phòng ban, Vai trò, hoặc User ID
        {
          visibility: {
            path: ['allowedDepartments'],
            array_contains: currentUser.departmentId,
          },
        },
        {
          visibility: {
            path: ['allowedRoles'],
            array_contains: currentUser.roleId,
          },
        },
        {
          visibility: {
            path: ['allowedUsers'],
            array_contains: currentUser.userId,
          },
        },
      ],
    };

    // Thực thi bộ phân trang toàn cục dùng chung
    return paginate(this.prisma.workflow, whereClause, options, {
      entity: { select: { id: true, name: true, code: true } },
      versions: { orderBy: { version: 'desc' } },
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

  // File: src/modules/workflows/workflows.service.ts

  async cloneVersion(workflowId: number, sourceVersionId: number) {
    const workflow = await this.findOne(workflowId);
    // Lấy kèm toàn bộ Steps và Transitions của phiên bản gốc
    const sourceVersion = await this.prisma.workflowVersion.findUnique({
      where: { id: sourceVersionId },
      include: {
        steps: {
          include: { transitionsOut: true },
        },
      },
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

      // 2. Clone sâu (Deep Clone) toàn bộ Steps và Transitions
      const oldToNewStepIdMap = new Map<number, number>();

      for (const oldStep of sourceVersion.steps) {
        const newStep = await tx.workflowStep.create({
          data: {
            versionId: newVersion.id,
            name: oldStep.name,
            stepType: oldStep.stepType,
            permissions: oldStep.permissions || {},
            orderIndex: oldStep.orderIndex,
          },
        });
        oldToNewStepIdMap.set(oldStep.id, newStep.id);
      }

      for (const oldStep of sourceVersion.steps) {
        for (const oldTransition of oldStep.transitionsOut) {
          await tx.workflowTransition.create({
            data: {
              fromStepId: oldToNewStepIdMap.get(oldTransition.fromStepId)!,
              toStepId: oldToNewStepIdMap.get(oldTransition.toStepId)!,
              conditionLogic: oldTransition.conditionLogic || {},
              autoSkip: oldTransition.autoSkip,
            },
          });
        }
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

  // Thay thế hàm startInstance() cũ trong workflows.service.ts
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

    const instance = await this.prisma.$transaction(async (tx) => {
      const newInstance = await tx.workflowInstance.create({
        data: {
          versionId: dto.versionId,
          recordId: dto.recordId,
          currentStep: firstStep.id,
          status: 'IN_PROGRESS',
        },
      });

      await tx.workflowLog.create({
        data: {
          instanceId: newInstance.id,
          stepId: firstStep.id,
          userId,
          action: 'START',
          comment: 'Khởi chạy luồng quy trình phê duyệt.',
        },
      });

      return newInstance;
    });

    // --- TỰ ĐỘNG BẮN EMAIL & THÔNG BÁO SSE ---
    const firstStepConfig: any = firstStep.permissions || {};
    const candidateUsers: number[] = firstStepConfig.candidateUsers || [];

    const initiator = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const initiatorName = initiator?.fullName || 'Nhân sự';
    const recordCode = record.recordCode || `#${record.id}`;

    for (const candidateId of candidateUsers) {
      const recipient = await this.prisma.user.findUnique({
        where: { id: candidateId },
      });

      // Gửi thông báo In-app và Email đồng thời
      await this.notificationsService.createNotification(
        candidateId,
        'Yêu cầu phê duyệt mới',
        `Phiếu đề xuất ${recordCode} vừa được trình ký bởi ${initiatorName} đang chờ bạn phê duyệt tại bước: ${firstStep.name}.`,
        {
          emailJobName: 'send-new-approval-request',
          emailPayload: {
            recipientName: recipient?.fullName || 'Thành viên',
            recordCode,
            initiatorName,
            stepName: firstStep.name,
          },
        },
      );
    }

    return instance;
  }

  // ====================================================
  // BẢN NÂNG CẤP HOÀN HẢO: HÀM LÕI PHÊ DUYỆT TÍCH HỢP HÀNG ĐỢI WEBHOOK ĐỘNG & THÔNG BÁO LÕI
  // ====================================================
  // ====================================================
  // BẢN NÂNG CẤP HOÀN HẢO: HÀM LÕI PHÊ DUYỆT TÍCH HỢP HÀNG ĐỢI WEBHOOK ĐỘNG & THÔNG BÁO LÕI
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

      // Đóng gói dữ liệu sạch để xử lý tác vụ thông báo & Webhook ngầm
      const nextStepConfig: any = nextStepObj?.permissions || {};
      return {
        instanceId,
        entityId: instance.record.entityId, // <-- BỔ SUNG TRƯỜNG NÀY ĐỂ TRUY VẤN WEBHOOK THEO BIỂU MẪU
        isCompleted: shouldTransition && finalStatus === 'COMPLETED',
        recordData: instance.record.data,
        recordCode: instance.record.recordCode || `#${instance.record.id}`,
        initiatorId: instance.record.createdBy,
        workflowName: instance.version.workflow.name,
        actionExecuted: actionLabel,
        isRejected: false,
        nextStepId: shouldTransition ? nextStepId : instance.currentStep,
        nextStepName: nextStepObj?.name || '',
        nextStepCandidates: nextStepConfig.candidateUsers || [],
        currentStepName: currentStepObj.name,
        shouldTransition,
      };
    });

    const approver = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    const approverName = approver?.fullName || 'Người duyệt';

    // --- 3. ĐỘNG CƠ THÔNG BÁO THỜI GIAN THỰC (REAL-TIME NOTIFICATION COCK) ---
    if (result.isCompleted) {
      const initiator = await this.prisma.user.findUnique({
        where: { id: result.initiatorId },
      });
      await this.notificationsService.createNotification(
        result.initiatorId,
        'Quy trình phê duyệt hoàn tất',
        `Hồ sơ ${result.recordCode} của bạn đã được PHÊ DUYỆT HOÀN TẤT qua tất cả các cấp!`,
        {
          // Có thể tạo Job email 'send-workflow-completed' riêng
          emailJobName: 'send-workflow-completed', // Giả sử chúng ta sẽ tạo template cho nó sau
          emailPayload: {
            recipientName: initiator?.fullName || 'Người dùng',
            recordCode: result.recordCode,
            status: 'Hoàn tất',
          },
        },
      );
    } else if (result.shouldTransition && result.nextStepId) {
      await this.notificationsService.createNotification(
        result.initiatorId,
        'Cập nhật tiến trình hồ sơ',
        `Hồ sơ ${result.recordCode} của bạn đã được ${approverName} chuyển tiếp sang bước: ${result.nextStepName}.`,
      );

      for (const candidateId of result.nextStepCandidates) {
        const recipient = await this.prisma.user.findUnique({
          where: { id: candidateId },
        });
        await this.notificationsService.createNotification(
          candidateId,
          'Yêu cầu phê duyệt mới cần xử lý',
          `Bạn nhận được một yêu cầu phê duyệt mới từ ${approverName} cho hồ sơ ${result.recordCode} tại trạm: ${result.nextStepName}.`,
          {
            emailJobName: 'send-new-approval-request',
            emailPayload: {
              recipientName: recipient?.fullName || 'Thành viên',
              recordCode: result.recordCode,
              initiatorName: approverName, // Người chuyển tiếp giờ là người khởi tạo của bước sau
              stepName: result.nextStepName,
            },
          },
        );
      }
    }

    // --- 4. ĐỘNG CƠ WEBHOOK ĐỘNG TRA CỨU DB & XỬ LÝ BẤT ĐỒNG BỘ (BULLMQ) ---
    if (result.isCompleted) {
      try {
        const configuredWebhooks = await this.prisma.webhookEndpoint.findMany({
          where: {
            entityId: result.entityId,
            isActive: true,
          },
        });

        const activeWebhooks = configuredWebhooks.filter((w) => {
          const events = w.events as string[];
          return Array.isArray(events) && events.includes('RECORD_COMPLETED');
        });

        for (const webhook of activeWebhooks) {
          await this.webhookQueue.add(
            'send-webhook',
            {
              instanceId: result.instanceId,
              webhookUrl: webhook.url, // Lấy URL động từ cơ sở dữ liệu
              payload: {
                event: 'WORKFLOW_COMPLETED',
                workflowName: result.workflowName,
                instanceId: result.instanceId,
                recordData: result.recordData,
                timestamp: new Date().toISOString(),
              },
            },
            {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
            },
          );
          console.log(
            `[Webhook Queue] Da xep hang gui Webhook den URL dong: ${webhook.url}`,
          );
        }
      } catch (error) {
        console.error(
          `[Webhook Queue] Loi khi chọc DB hoac nap Job vao Redis: ${error.message}`,
        );
      }
    }

    const updatedInstance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    return {
      ...updatedInstance,
      transitioned: result.shouldTransition,
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
