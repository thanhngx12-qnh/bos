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
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { NotificationsService } from '../notifications/notifications.service';
import { paginate, PaginateOptions } from '../../prisma/prisma.helper';
import { ConditionEvaluatorService } from '../../core/engines/condition-evaluator.service';
import { TasksService } from '../tasks/tasks.service';
import { OnEvent } from '@nestjs/event-emitter';
import { ReferenceResolverService } from '../../core/engines/reference-resolver.service';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly referenceResolver: ReferenceResolverService,
    private readonly tasksService: TasksService,
    @InjectQueue('webhook-queue') private readonly webhookQueue: Queue,
  ) {}

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

  async create(dto: CreateWorkflowDto) {
    const entity = await this.prisma.entity.findFirst({
      where: { id: dto.entityId } as any,
    });
    if (!entity)
      throw new NotFoundException('Không tìm thấy Biểu mẫu (Entity).');

    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          entityId: dto.entityId,
          name: dto.name,
          description: dto.description,
        } as any,
      });

      const version = await tx.workflowVersion.create({
        data: {
          workflowId: workflow.id,
          version: 1,
          status: 'DRAFT',
        } as any,
      });

      return { ...workflow, versions: [version] };
    });
  }

  async findAll(currentUser: any, options: PaginateOptions) {
    const whereClause: any = {
      OR: [
        { visibility: { path: ['allowAll'], equals: true } },
        { visibility: { equals: {} } },
        {
          visibility: {
            path: ['allowedUserTypes'],
            array_contains: currentUser.userType,
          },
        },
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

    return paginate(this.prisma.workflow, whereClause, options, {
      entity: { select: { id: true, name: true, code: true } },
      versions: { orderBy: { version: 'desc' } },
    });
  }

  async findOne(id: number) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id } as any,
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
      where: { id } as any,
      data: dto as any,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    const hasInstances = await this.prisma.workflowInstance.findFirst({
      where: { version: { workflowId: id } } as any,
    });
    if (hasInstances) {
      throw new BadRequestException(
        'Không thể xóa: Quy trình này đã phát sinh các lượt chạy trong thực tế.',
      );
    }
    return this.prisma.workflow.delete({ where: { id } as any });
  }

  async cloneVersion(workflowId: number, sourceVersionId: number) {
    const workflow = await this.findOne(workflowId);
    const sourceVersion = await this.prisma.workflowVersion.findFirst({
      where: { id: sourceVersionId } as any,
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
      const newVersion = await tx.workflowVersion.create({
        data: {
          workflowId,
          version: maxVersion + 1,
          status: 'DRAFT',
        } as any,
      });

      const oldToNewStepIdMap = new Map<number, number>();

      for (const oldStep of sourceVersion.steps) {
        const newStep = await tx.workflowStep.create({
          data: {
            versionId: newVersion.id,
            name: oldStep.name,
            stepType: oldStep.stepType,
            permissions: oldStep.permissions || {},
            orderIndex: oldStep.orderIndex,
          } as any,
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
            } as any,
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
        where: { workflowId, status: 'PUBLISHED' } as any,
        data: { status: 'ARCHIVED' } as any,
      });
    }

    return this.prisma.workflowVersion.update({
      where: { id: versionId, workflowId } as any,
      data: { status } as any,
    });
  }

  async startInstance(userId: number, dto: CreateInstanceDto) {
    const record = await this.prisma.record.findFirst({
      where: { id: dto.recordId } as any,
    });
    if (!record) throw new NotFoundException('Không tìm thấy Bản ghi dữ liệu.');

    const version = await this.prisma.workflowVersion.findFirst({
      where: { id: dto.versionId } as any,
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
      where: { recordId: dto.recordId, status: 'IN_PROGRESS' } as any,
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
          currentStepId: firstStep.id,
          status: 'IN_PROGRESS',
        } as any,
      });

      await tx.workflowLog.create({
        data: {
          instanceId: newInstance.id,
          stepId: firstStep.id,
          userId,
          action: 'START',
          comment: 'Khởi chạy luồng quy trình phê duyệt.',
        } as any,
      });

      const stepConfig: any = firstStep.permissions || {};
      const assigneeExpression = stepConfig.assigneeExpression;

      if (assigneeExpression) {
        const resolvedUserIds = await this.referenceResolver.resolveCandidates(
          assigneeExpression,
          dto.recordId,
          userId,
        );
        if (resolvedUserIds.length > 0) {
          stepConfig.candidateUsers = resolvedUserIds;
          firstStep.permissions = stepConfig;
        }
      }

      await this.tasksService.createTasksForStep(
        tx,
        (record as any).tenantId,
        newInstance.id,
        firstStep,
        record,
      );

      return newInstance;
    });

    const firstStepConfig: any = firstStep.permissions || {};
    const candidateUsers: number[] = firstStepConfig.candidateUsers || [];

    const initiator = await this.prisma.user.findFirst({
      where: { id: userId } as any,
    });
    const initiatorName = initiator?.fullName || 'Nhân sự';
    const recordCode = (record as any).businessCode || `#${record.id}`;

    for (const candidateId of candidateUsers) {
      const recipient = await this.prisma.user.findFirst({
        where: { id: candidateId } as any,
      });

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
  // BẢN NÂNG CẤP HOÀN HẢO: ĐỒNG BỘ TRẠNG THÁI RECORD
  // ====================================================
  async handleAction(
    instanceId: number,
    userId: number,
    dto: WorkflowActionDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe(
        `SELECT id FROM workflow_instances WHERE id = $1 FOR UPDATE`,
        instanceId,
      );

      const instance = await tx.workflowInstance.findFirst({
        where: { id: instanceId } as any,
        include: {
          record: true,
          version: {
            include: {
              steps: {
                include: { transitionsOut: true },
              },
              workflow: { select: { name: true } },
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

      const transition = await tx.workflowTransition.findFirst({
        where: { id: dto.transitionId } as any,
        include: { fromStep: true, toStep: true },
      });

      if (!transition)
        throw new NotFoundException(
          'Không tìm thấy đường nối quy trình (Nút bấm).',
        );
      if (transition.fromStepId !== (instance as any).currentStepId) {
        throw new BadRequestException(
          'Đường nối không thuộc về bước duyệt hiện tại của phiếu.',
        );
      }

      const currentStepObj = transition.fromStep;
      let nextStepObj = transition.toStep;

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

      // === BẢN VÁ 1: KIỂM TRA ĐIỀU KIỆN CHUYỂN BƯỚC ===
      const isConditionMet = this.conditionEvaluator.evaluate(
        transition.conditionLogic,
        instance.record.data as any,
      );
      if (!isConditionMet) {
        throw new BadRequestException(
          `Dữ liệu hồ sơ hiện tại không đáp ứng điều kiện phê duyệt của nút bấm '${actionLabel}'.`,
        );
      }

      await tx.workflowLog.create({
        data: {
          instanceId,
          stepId: (instance as any).currentStepId,
          userId,
          action: actionLabel,
          comment: dto.comment || `Đã thực hiện hành động: ${actionLabel}`,
          snapshot: dto.signatureData
            ? ({ signature: dto.signatureData } as any)
            : undefined,
        } as any,
      });

      let shouldTransition = true;

      if (approverType === 'ALL_OF' && candidateUsers.length > 1) {
        const approvedLogs = await tx.workflowLog.findMany({
          where: {
            instanceId,
            stepId: (instance as any).currentStepId,
            action: actionLabel,
          } as any,
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
        await this.tasksService.cancelPendingTasks(
          tx,
          instanceId,
          (instance as any).currentStepId,
        );

        let evaluatingStepObj = nextStepObj;

        while (evaluatingStepObj) {
          if (evaluatingStepObj.stepType === 'SYSTEM_TASK') {
            finalStatus = 'COMPLETED';
            break;
          }

          const fullStepData = instance.version.steps.find(
            (s) => s.id === evaluatingStepObj.id,
          );
          const outgoingTransitions = fullStepData?.transitionsOut || [];

          const autoSkipTransition = outgoingTransitions.find((t) => {
            if (!t.autoSkip) return false;
            const logic: any = t.conditionLogic || {};
            return this.conditionEvaluator.evaluate(
              logic, // <-- SỬA TẠI ĐÂY (Thay vì logic.rules)
              instance.record.data as any,
            );
          });

          if (autoSkipTransition) {
            console.log(
              `[Auto-Skip] Bước '${evaluatingStepObj.name}' tự động bị bỏ qua!`,
            );
            nextStepId = autoSkipTransition.toStepId;
            evaluatingStepObj = instance.version.steps.find(
              (s) => s.id === nextStepId,
            ) as any;
          } else {
            break;
          }
        }

        await tx.workflowInstance.update({
          where: { id: instanceId } as any,
          data: {
            currentStepId: nextStepId,
            status: finalStatus,
          } as any,
        });

        // --- BẢN VÁ: ĐỒNG BỘ TRẠNG THÁI VỀ BẢNG RECORD ---
        if (finalStatus === 'COMPLETED' || finalStatus === 'REJECTED') {
          await tx.record.update({
            where: { id: instance.recordId } as any,
            data: { status: finalStatus } as any,
          });
        }

        if (finalStatus === 'IN_PROGRESS' && evaluatingStepObj) {
          const nextStepConfig: any = evaluatingStepObj.permissions || {};
          const nextAssigneeExpression = nextStepConfig.assigneeExpression;

          if (nextAssigneeExpression) {
            const resolvedUsers =
              await this.referenceResolver.resolveCandidates(
                nextAssigneeExpression,
                instance.recordId,
                (instance.record as any).createdById,
              );
            if (resolvedUsers.length > 0) {
              nextStepConfig.candidateUsers = resolvedUsers;
              evaluatingStepObj.permissions = nextStepConfig;
            }
          }

          await this.tasksService.createTasksForStep(
            tx,
            (instance as any).tenantId,
            instanceId,
            evaluatingStepObj,
            instance.record,
          );

          nextStepObj = evaluatingStepObj;
        }
      }

      const nextStepConfig: any = nextStepObj?.permissions || {};
      return {
        instanceId,
        entityId: instance.record.entityId,
        isCompleted: shouldTransition && finalStatus === 'COMPLETED',
        recordData: instance.record.data,
        recordCode:
          (instance.record as any).businessCode || `#${instance.record.id}`,
        initiatorId: (instance.record as any).createdById,
        workflowName: (instance.version as any).workflow.name,
        actionExecuted: actionLabel,
        isRejected: false,
        nextStepId: shouldTransition
          ? nextStepId
          : (instance as any).currentStepId,
        nextStepName: nextStepObj?.name || '',
        nextStepCandidates: nextStepConfig.candidateUsers || [],
        currentStepName: currentStepObj.name,
        shouldTransition,
      };
    });

    const approver = await this.prisma.user.findFirst({
      where: { id: userId } as any,
    });
    const approverName = approver?.fullName || 'Người duyệt';

    if (result.isCompleted) {
      const initiator = await this.prisma.user.findFirst({
        where: { id: result.initiatorId } as any,
      });
      await this.notificationsService.createNotification(
        result.initiatorId,
        'Quy trình phê duyệt hoàn tất',
        `Hồ sơ ${result.recordCode} của bạn đã được PHÊ DUYỆT HOÀN TẤT qua tất cả các cấp!`,
        {
          emailJobName: 'send-workflow-completed',
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
        const recipient = await this.prisma.user.findFirst({
          where: { id: candidateId } as any,
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
              initiatorName: approverName,
              stepName: result.nextStepName,
            },
          },
        );
      }
    }

    if (result.isCompleted) {
      try {
        const configuredWebhooks = await this.prisma.webhookEndpoint.findMany({
          where: {
            entityId: result.entityId,
            isActive: true,
          } as any,
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
              webhookUrl: webhook.url,
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

    const updatedInstance = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId } as any,
    });

    return {
      ...updatedInstance,
      transitioned: result.shouldTransition,
      actionExecuted: result.actionExecuted,
    };
  }

  async getInstanceLogs(instanceId: number) {
    return this.prisma.workflowLog.findMany({
      where: { instanceId } as any,
      include: {
        step: { select: { name: true } },
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ==========================================
  // ĐỒNG BỘ TRẠNG THÁI TỪ EVENT BUS (TASK ENGINE)
  // ==========================================
  @OnEvent('task.completed')
  async handleTaskCompletedEvent(payload: {
    taskId: number;
    instanceId: number;
    stepId: number;
    userId: number;
    comment?: string;
  }) {
    console.log(
      `[Workflow Event Bus] Nhận tín hiệu Task ${payload.taskId} hoàn thành. Kích hoạt rà soát trạm ${payload.stepId}...`,
    );

    const instance = await this.prisma.workflowInstance.findFirst({
      where: { id: payload.instanceId } as any,
      include: {
        version: {
          include: { steps: true },
        },
      },
    });

    if (!instance || instance.status !== 'IN_PROGRESS') return;

    const currentStep = instance.version.steps.find(
      (s) => s.id === (instance as any).currentStepId,
    );
    if (!currentStep || currentStep.id !== payload.stepId) return;

    const stepConfig: any = currentStep.permissions || {};
    const approverType = stepConfig.approverType || 'SINGLE';

    if (approverType === 'ALL_OF') {
      const pendingTasksCount = await this.prisma.task.count({
        where: {
          instanceId: payload.instanceId,
          stepId: payload.stepId,
          status: 'PENDING',
        } as any,
      });

      if (pendingTasksCount > 0) {
        console.log(
          `[Workflow Event Bus] Trạm ${currentStep.name} vẫn còn ${pendingTasksCount} task chưa hoàn thành. Chờ tiếp...`,
        );
        return;
      }
    }

    const transition = await this.prisma.workflowTransition.findFirst({
      where: { fromStepId: currentStep.id } as any,
    });

    if (transition) {
      console.log(
        `[Workflow Event Bus] Đủ điều kiện đồng thuận! Tự động kích hoạt chuyển trạm...`,
      );
      const actionDto: WorkflowActionDto = {
        transitionId: transition.id,
        comment: payload.comment || 'Tự động duyệt qua Task Engine',
      };

      await this.handleAction(payload.instanceId, payload.userId, actionDto);
    }
  }
}
