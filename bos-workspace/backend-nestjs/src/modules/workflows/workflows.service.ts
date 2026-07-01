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
import { ReferenceResolverService } from '../../core/engines/reference-resolver.service';
import { paginate, PaginateOptions } from '../../prisma/prisma.helper';
import { ConditionEvaluatorService } from '../../core/engines/condition-evaluator.service';
import { TasksService } from '../tasks/tasks.service';
import { OnEvent } from '@nestjs/event-emitter';
import { OutboxService } from '../outbox/outbox.service';
import { v4 as uuidv4 } from 'uuid';
import { RedisService } from '../redis/redis.service';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    private readonly referenceResolver: ReferenceResolverService,
    private readonly tasksService: TasksService,
    @InjectQueue('webhook-queue') private readonly webhookQueue: Queue,
    private readonly outboxService: OutboxService,
    private readonly redis: RedisService,
    private readonly mailerService: MailerService,
  ) {}

  private stripAccents(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase();
  }

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

      // Kiểm tra nếu bước tiếp theo yêu cầu chọn người duyệt động
      if (stepConfig.chooseApproverDynamically && !dto.nextAssigneeId) {
        throw new BadRequestException('Vui lòng chọn người duyệt tiếp theo.');
      }

      await this.tasksService.createTasksForStep(
        tx,
        (record as any).tenantId,
        newInstance.id,
        firstStep,
        record,
        dto.nextAssigneeId,
      );

      // ĐỒNG BỘ: Cập nhật record status → IN_PROGRESS khi bắt đầu quy trình
      await tx.record.update({
        where: { id: dto.recordId } as any,
        data: { status: 'IN_PROGRESS' } as any,
      });

      return newInstance;
    });

    // Bổ sung: Tự động chuyển bước nếu bước đầu tiên là SYSTEM_TASK
    let currentStepForNotify = firstStep;
    if (firstStep.stepType === 'SYSTEM_TASK') {
      const autoTransition = await this.prisma.workflowTransition.findFirst({
        where: { fromStepId: firstStep.id } as any,
      });
      if (autoTransition) {
        try {
          await this.handleSystemAutoTransition(
            instance.id,
            autoTransition.id,
            'Tự động khởi tạo',
            'Hệ thống tự động xử lý bước khởi tạo và chuyển sang bước tiếp theo.',
          );
          // Tải lại instance để lấy currentStepId mới nhất
          const refreshed = await this.prisma.workflowInstance.findFirst({
            where: { id: instance.id } as any,
          });
          if (refreshed) {
            instance.currentStepId = refreshed.currentStepId;
          }
          const currentStep = version.steps.find(
            (s) => s.id === instance.currentStepId,
          );
          if (currentStep) {
            currentStepForNotify = currentStep;
          }
        } catch (err) {
          console.error(`[Workflow] Auto-transition SYSTEM_TASK thất bại:`, err);
        }
      }
    }

    // Lấy danh sách người được giao việc ở bước hiện tại (sau auto-transition)
    const actualTasks = await this.prisma.task.findMany({
      where: {
        instanceId: instance.id,
        stepId: instance.currentStepId,
        status: 'PENDING',
      } as any,
    });
    const candidateUsers: number[] = actualTasks.map((t) => t.assigneeId).filter(Boolean) as number[];

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
        `Phiếu đề xuất ${recordCode} vừa được trình ký bởi ${initiatorName} đang chờ bạn phê duyệt tại bước: ${currentStepForNotify.name}.`,
        {
          emailJobName: 'send-new-approval-request',
          emailPayload: {
            recipientName: recipient?.fullName || 'Thành viên',
            recordCode,
            initiatorName,
            stepName: currentStepForNotify.name,
          },
        },
      );
    }

    await this.notifyObservers(
      record.id,
      recordCode,
      'Theo dõi hồ sơ mới',
      `Bạn được gắn thẻ là người liên quan trong hồ sơ ${recordCode} khởi tạo bởi ${initiatorName}. Trạng thái hiện tại: Chờ duyệt tại bước: ${currentStepForNotify.name}.`,
      candidateUsers,
    );

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

      if (requiresSignature) {
        if (!dto.signatureData) {
          throw new BadRequestException(
            `Nút bấm '${actionLabel}' yêu cầu bạn phải thực hiện vẽ Chữ ký điện tử.`,
          );
        }
        if (!dto.otpCode) {
          throw new BadRequestException(
            `Nút bấm '${actionLabel}' yêu cầu bạn phải nhập mã xác thực OTP.`,
          );
        }

        const redisKey = `otp:instance:${instanceId}:user:${userId}:transition:${dto.transitionId}`;
        const cachedOtp = await this.redis.get(redisKey);
        if (!cachedOtp) {
          throw new BadRequestException(
            'Mã OTP đã hết hạn hoặc chưa được yêu cầu. Vui lòng bấm gửi lại mã OTP.',
          );
        }
        if (cachedOtp !== dto.otpCode) {
          throw new BadRequestException(
            'Mã xác thực OTP không chính xác. Vui lòng kiểm tra lại.',
          );
        }

        await this.redis.del(redisKey);
      }

      // === BẢN VÁ: KIỂM TRA TÀI LIỆU ĐÍNH KÈM BẮT BUỘC (REQUIRED ATTACHMENTS) ===
      const requiredAttachments = transLogic.requiredAttachments || [];
      if (Array.isArray(requiredAttachments) && requiredAttachments.length > 0) {
        const recordAttachments = await tx.attachment.findMany({
          where: { recordId: instance.recordId } as any,
        });
        const attachedFileNames = recordAttachments.map(att => att.fileName.toLowerCase());
        
        for (const reqDoc of requiredAttachments) {
          const matched = attachedFileNames.some(fileName => fileName.includes(reqDoc.toLowerCase()));
          if (!matched) {
            throw new BadRequestException(
              `Hành động '${actionLabel}' yêu cầu bạn phải tải lên đầy đủ tài liệu: '${reqDoc}'. Vui lòng đính kèm file trước khi phê duyệt.`
            );
          }
        }
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

      let snapshotObj: any = undefined;
      if (requiresSignature) {
        const userObj = await tx.user.findUnique({
          where: { id: userId },
          include: { department: true, role: true },
        });
        snapshotObj = {
          signature: dto.signatureData,
          stamp: dto.stampData || undefined,
          layout: dto.signatureLayout || 'vertical',
          signerName: userObj?.fullName || 'Hệ thống',
          signerRole: userObj?.role?.name || 'Thành viên',
          signerDept: userObj?.department?.name || 'Doanh nghiệp',
          signingTime: new Date().toLocaleString('vi-VN'),
          showSignerName: dto.showSignerName !== false,
          showSignerRole: dto.showSignerRole !== false,
          showSignerDept: dto.showSignerDept !== false,
          showSigningTime: dto.showSigningTime !== false,
          fontFamily: dto.fontFamily || 'sans-serif',
          fontSize: dto.fontSize !== undefined ? Number(dto.fontSize) : 11,
          fontBold: dto.fontBold === true,
          fontItalic: dto.fontItalic === true,
        };
      }

      await tx.workflowLog.create({
        data: {
          instanceId,
          stepId: (instance as any).currentStepId,
          userId,
          action: actionLabel,
          comment: dto.comment || `Đã thực hiện hành động: ${actionLabel}`,
          snapshot: snapshotObj,
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
          userId,  // actor => task của họ sẽ COMPLETED, còn lại CANCELLED
        );

        let evaluatingStepObj = nextStepObj;

        while (evaluatingStepObj) {
          if (evaluatingStepObj.stepType === 'SYSTEM_TASK') {
            const cleanName = this.stripAccents(evaluatingStepObj.name);
            const isRejectStep =
              cleanName.includes('tu choi') ||
              cleanName.includes('reject') ||
              cleanName.includes('khong duyet') ||
              cleanName.includes('khong phe duyet');
            finalStatus = isRejectStep ? 'REJECTED' : 'COMPLETED';
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

        if (finalStatus === 'COMPLETED') {
          const completedEvent = {
            eventType: 'workflow.completed',
            payload: {
              recordId: instance.recordId,
              entityId: instance.record.entityId,
              recordCode: (instance.record as any).businessCode || `#${instance.record.id}`,
              recordData: instance.record.data,
              workflowId: instance.version.workflowId,
              instanceId: instance.id,
              initiatorId: (instance.record as any).createdById,
            },
            metadata: {
              tenantId: (instance as any).tenantId,
              correlationId: uuidv4(),
              timestamp: new Date().toISOString(),
              userId: userId,
            },
          };
          await this.outboxService.addToOutbox(tx, completedEvent);
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

          // Kiểm tra nếu bước tiếp theo yêu cầu chọn người duyệt động
          if (nextStepConfig.chooseApproverDynamically && !dto.nextAssigneeId) {
            throw new BadRequestException('Vui lòng chọn người duyệt tiếp theo.');
          }

          await this.tasksService.createTasksForStep(
            tx,
            (instance as any).tenantId,
            instanceId,
            evaluatingStepObj,
            instance.record,
            dto.nextAssigneeId,
          );

          nextStepObj = evaluatingStepObj;
        }
      }

      let nextStepAssignees: number[] = [];
      if (shouldTransition && nextStepId) {
        const nextTasks = await tx.task.findMany({
          where: {
            instanceId,
            stepId: nextStepId,
            status: 'PENDING',
          } as any,
        });
        nextStepAssignees = nextTasks.map((t) => t.assigneeId).filter(Boolean) as number[];
      }

      return {
        instanceId,
        recordId: instance.recordId,
        entityId: instance.record.entityId,
        isCompleted: shouldTransition && finalStatus === 'COMPLETED',
        recordData: instance.record.data,
        recordCode:
          (instance.record as any).businessCode || `#${instance.record.id}`,
        initiatorId: (instance.record as any).createdById,
        workflowName: (instance.version as any).workflow.name,
        actionExecuted: actionLabel,
        isRejected: finalStatus === 'REJECTED',
        nextStepId: shouldTransition
          ? nextStepId
          : (instance as any).currentStepId,
        nextStepName: nextStepObj?.name || '',
        nextStepCandidates: nextStepAssignees,
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
      await this.notifyObservers(
        result.recordId,
        result.recordCode,
        'Theo dõi cập nhật hồ sơ',
        `Hồ sơ liên quan ${result.recordCode} đã được PHÊ DUYỆT HOÀN TẤT.`,
        [result.initiatorId, userId],
      );
    } else if (result.isRejected) {
      const initiator = await this.prisma.user.findFirst({
        where: { id: result.initiatorId } as any,
      });
      await this.notificationsService.createNotification(
        result.initiatorId,
        'Quy trình bị từ chối',
        `Hồ sơ ${result.recordCode} của bạn đã bị từ chối bởi ${approverName}.`,
        {
          emailJobName: 'send-workflow-completed',
          emailPayload: {
            recipientName: initiator?.fullName || 'Người dùng',
            recordCode: result.recordCode,
            status: 'Bị từ chối',
          },
        },
      );
      await this.notifyObservers(
        result.recordId,
        result.recordCode,
        'Theo dõi cập nhật hồ sơ',
        `Hồ sơ liên quan ${result.recordCode} đã bị TỪ CHỐI bởi ${approverName}.`,
        [result.initiatorId, userId],
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

      await this.notifyObservers(
        result.recordId,
        result.recordCode,
        'Theo dõi cập nhật hồ sơ',
        `Hồ sơ liên quan ${result.recordCode} đã được chuyển tiếp sang bước: ${result.nextStepName}.`,
        [result.initiatorId, userId, ...result.nextStepCandidates],
      );
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

  async handleSystemAutoTransition(
    instanceId: number,
    transitionId: number,
    actionLabel: string,
    comment: string,
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
          'Lượt chạy quy trình này đã kết thúc hoặc đang được xử lý.',
        );
      }

      const transition = await tx.workflowTransition.findFirst({
        where: { id: transitionId } as any,
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

      await tx.workflowLog.create({
        data: {
          instanceId,
          stepId: (instance as any).currentStepId,
          userId: null,
          action: actionLabel,
          comment: comment || `Hệ thống tự động chuyển trạm: ${actionLabel}`,
          snapshot: undefined,
        } as any,
      });

      let shouldTransition = true;
      let finalStatus = 'IN_PROGRESS';
      let nextStepId: number | null = transition.toStepId;

      if (shouldTransition) {
        await this.tasksService.cancelPendingTasks(
          tx,
          instanceId,
          (instance as any).currentStepId,
          undefined,
        );

        let evaluatingStepObj = nextStepObj;

        while (evaluatingStepObj) {
          if (evaluatingStepObj.stepType === 'SYSTEM_TASK') {
            const cleanName = this.stripAccents(evaluatingStepObj.name);
            const isRejectStep =
              cleanName.includes('tu choi') ||
              cleanName.includes('reject') ||
              cleanName.includes('khong duyet') ||
              cleanName.includes('khong phe duyet');
            finalStatus = isRejectStep ? 'REJECTED' : 'COMPLETED';
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
              logic,
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

        if (finalStatus === 'COMPLETED' || finalStatus === 'REJECTED') {
          await tx.record.update({
            where: { id: instance.recordId } as any,
            data: { status: finalStatus } as any,
          });
        }

        if (finalStatus === 'COMPLETED') {
          const completedEvent = {
            eventType: 'workflow.completed',
            payload: {
              recordId: instance.recordId,
              entityId: instance.record.entityId,
              recordCode: (instance.record as any).businessCode || `#${instance.record.id}`,
              recordData: instance.record.data,
              workflowId: instance.version.workflowId,
              instanceId: instance.id,
              initiatorId: (instance.record as any).createdById,
            },
            metadata: {
              tenantId: (instance as any).tenantId,
              correlationId: uuidv4(),
              timestamp: new Date().toISOString(),
              userId: undefined,
            },
          };
          await this.outboxService.addToOutbox(tx, completedEvent);
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
            undefined,
          );

          nextStepObj = evaluatingStepObj;
        }
      }

      let nextStepAssignees: number[] = [];
      if (shouldTransition && nextStepId) {
        const nextTasks = await tx.task.findMany({
          where: {
            instanceId,
            stepId: nextStepId,
            status: 'PENDING',
          } as any,
        });
        nextStepAssignees = nextTasks.map((t) => t.assigneeId).filter(Boolean) as number[];
      }

      return {
        instanceId,
        recordId: instance.recordId,
        entityId: instance.record.entityId,
        isCompleted: finalStatus === 'COMPLETED',
        recordData: instance.record.data,
        recordCode:
          (instance.record as any).businessCode || `#${instance.record.id}`,
        initiatorId: (instance.record as any).createdById,
        workflowName: (instance.version as any).workflow.name,
        actionExecuted: actionLabel,
        isRejected: finalStatus === 'REJECTED',
        nextStepId,
        nextStepName: nextStepObj?.name || '',
        nextStepCandidates: nextStepAssignees,
        currentStepName: currentStepObj.name,
        shouldTransition,
      };
    });

    if (result.isCompleted) {
      const initiator = await this.prisma.user.findFirst({
        where: { id: result.initiatorId } as any,
      });
      await this.notificationsService.createNotification(
        result.initiatorId,
        'Quy trình phê duyệt hoàn tất (Tự động)',
        `Hồ sơ ${result.recordCode} của bạn đã được HỆ THỐNG TỰ ĐỘNG PHÊ DUYỆT do quá hạn SLA!`,
        {
          emailJobName: 'send-workflow-completed',
          emailPayload: {
            recipientName: initiator?.fullName || 'Người dùng',
            recordCode: result.recordCode,
            status: 'Hoàn tất (Tự động)',
          },
        },
      );
      await this.notifyObservers(
        result.recordId,
        result.recordCode,
        'Theo dõi cập nhật hồ sơ (Tự động)',
        `Hồ sơ liên quan ${result.recordCode} đã được HỆ THỐNG TỰ ĐỘNG PHÊ DUYỆT do quá hạn SLA.`,
        [result.initiatorId],
      );
    } else if (result.isRejected) {
      const initiator = await this.prisma.user.findFirst({
        where: { id: result.initiatorId } as any,
      });
      await this.notificationsService.createNotification(
        result.initiatorId,
        'Quy trình phê duyệt bị từ chối (Tự động)',
        `Hồ sơ ${result.recordCode} của bạn đã bị HỆ THỐNG TỰ ĐỘNG TỪ CHỐI do quá hạn SLA!`,
        {
          emailJobName: 'send-workflow-completed',
          emailPayload: {
            recipientName: initiator?.fullName || 'Người dùng',
            recordCode: result.recordCode,
            status: 'Từ chối (Tự động)',
          },
        },
      );
      await this.notifyObservers(
        result.recordId,
        result.recordCode,
        'Theo dõi cập nhật hồ sơ (Tự động)',
        `Hồ sơ liên quan ${result.recordCode} đã bị HỆ THỐNG TỰ ĐỘNG TỪ CHỐI do quá hạn SLA.`,
        [result.initiatorId],
      );
    } else if (result.nextStepId) {
      await this.notificationsService.createNotification(
        result.initiatorId,
        'Cập nhật tiến trình hồ sơ (Tự động)',
        `Hồ sơ ${result.recordCode} của bạn đã được chuyển tiếp tự động sang bước: ${result.nextStepName} do trễ hạn SLA.`,
      );

      for (const candidateId of result.nextStepCandidates) {
        const recipient = await this.prisma.user.findFirst({
          where: { id: candidateId } as any,
        });
        await this.notificationsService.createNotification(
          candidateId,
          'Yêu cầu phê duyệt mới cần xử lý (Tự động)',
          `Bạn nhận được một yêu cầu phê duyệt mới chuyển tiếp tự động do quá hạn SLA cho hồ sơ ${result.recordCode} tại trạm: ${result.nextStepName}.`,
          {
            emailJobName: 'send-new-approval-request',
            emailPayload: {
              recipientName: recipient?.fullName || 'Thành viên',
              recordCode: result.recordCode,
              initiatorName: 'Hệ thống SLA',
              stepName: result.nextStepName,
            },
          },
        );
      }
      await this.notifyObservers(
        result.recordId,
        result.recordCode,
        'Theo dõi cập nhật hồ sơ (Tự động)',
        `Hồ sơ liên quan ${result.recordCode} đã được chuyển tiếp tự động sang bước: ${result.nextStepName} do trễ hạn SLA.`,
        [result.initiatorId, ...result.nextStepCandidates],
      );
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
            `[Webhook Queue] Đã xếp hàng gửi Webhook đến URL: ${webhook.url}`,
          );
        }
      } catch (error) {
        console.error(
          `[Webhook Queue] Lỗi khi kích hoạt Webhook tự động: ${error.message}`,
        );
      }
    }

    const updatedInstance = await this.prisma.workflowInstance.findFirst({
      where: { id: instanceId } as any,
    });

    return {
      ...updatedInstance,
      transitioned: true,
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

  async getLatestInstanceLogs(recordId: number) {
    const latestInstance = await this.prisma.workflowInstance.findFirst({
      where: { recordId } as any,
      orderBy: { id: 'desc' },
    });
    if (!latestInstance) return [];
    return this.getInstanceLogs(latestInstance.id);
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

  async getLatestInstanceProgress(recordId: number) {
    const latestInstance = await this.prisma.workflowInstance.findFirst({
      where: { recordId } as any,
      orderBy: { id: 'desc' },
      include: {
        version: {
          include: {
            steps: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        tasks: {
          where: { status: 'PENDING' } as any,
        },
        logs: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!latestInstance) {
      return { hasWorkflow: false };
    }

    const assigneeIds = latestInstance.tasks
      .map((t) => t.assigneeId)
      .filter((id) => id !== null && id !== undefined) as number[];

    const assignees = assigneeIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];

    const assigneeMap = new Map(assignees.map((u) => [u.id, u]));

    const activeTasks = latestInstance.tasks.map((task) => ({
      ...task,
      assignee: task.assigneeId ? assigneeMap.get(task.assigneeId) : null,
    }));

    return {
      hasWorkflow: true,
      instanceId: latestInstance.id,
      status: latestInstance.status,
      currentStepId: (latestInstance as any).currentStepId,
      version: {
        id: latestInstance.version.id,
        version: latestInstance.version.version,
      },
      steps: latestInstance.version.steps.map((step) => {
        const stepLogs = latestInstance.logs.filter((l) => l.stepId === step.id);
        const isCurrent = (latestInstance as any).currentStepId === step.id && latestInstance.status === 'IN_PROGRESS';
        
        let stepStatus = 'FUTURE'; // FUTURE, PENDING, COMPLETED, REJECTED
        if (latestInstance.status === 'APPROVED' || latestInstance.status === 'COMPLETED') {
          stepStatus = 'COMPLETED';
        } else if (latestInstance.status === 'REJECTED') {
          if ((latestInstance as any).currentStepId === step.id) {
            stepStatus = 'REJECTED';
          } else if (stepLogs.length > 0) {
            stepStatus = 'COMPLETED';
          } else {
            stepStatus = 'FUTURE';
          }
        } else {
          if (isCurrent) {
            stepStatus = 'PENDING';
          } else if (stepLogs.length > 0) {
            stepStatus = 'COMPLETED';
          } else {
            stepStatus = 'FUTURE';
          }
        }

        const stepTasks = activeTasks.filter((t) => t.stepId === step.id);

        return {
          id: step.id,
          name: step.name,
          stepType: step.stepType,
          orderIndex: step.orderIndex,
          status: stepStatus,
          logs: stepLogs.map((log) => ({
            id: log.id,
            action: log.action,
            comment: log.comment,
            createdAt: log.createdAt,
            user: log.user,
            snapshot: log.snapshot,
          })),
          tasks: stepTasks.map((t) => ({
            id: t.id,
            assigneeId: t.assigneeId,
            assigneeName: t.assignee?.fullName || `User #${t.assigneeId}`,
            assigneeEmail: t.assignee?.email,
            status: t.status,
            estimatedCompletionTime: t.estimatedCompletionTime,
          })),
        };
      }),
    };
  }

  async requestTransitionOtp(instanceId: number, transitionId: number, userId: number) {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        record: true,
      },
    });
    if (!instance) {
      throw new NotFoundException('Không tìm thấy lượt chạy quy trình.');
    }

    const transition = await this.prisma.workflowTransition.findUnique({
      where: { id: transitionId },
      include: { fromStep: true },
    });
    if (!transition || transition.fromStepId !== (instance as any).currentStepId) {
      throw new BadRequestException('Nút bấm không hợp lệ hoặc không thuộc bước hiện tại.');
    }

    const stepConfig: any = transition.fromStep.permissions || {};
    const candidateUsers = stepConfig.candidateUsers || [];
    if (candidateUsers.length > 0 && !candidateUsers.includes(userId)) {
      throw new BadRequestException(
        'Tài khoản của bạn không được phân quyền thực hiện hành động tại bước này.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const redisKey = `otp:instance:${instanceId}:user:${userId}:transition:${transitionId}`;
    await this.redis.set(redisKey, otpCode, 120);

    const transLogic = (transition.conditionLogic || {}) as any;
    const actionLabel = transLogic.actionLabel || 'Phê duyệt';
    await this.mailerService.sendOtpCode(user.email, user.fullName, otpCode, actionLabel);

    return {
      success: true,
      message: 'Mã xác thực OTP đã được gửi qua email của bạn.',
      mockCode: otpCode,
    };
  }

  private async notifyObservers(
    recordId: number,
    recordCode: string,
    title: string,
    message: string,
    excludeUserIds: number[] = [],
  ) {
    try {
      const record = await this.prisma.record.findFirst({
        where: { id: recordId } as any,
      });
      if (!record || !record.data) return;
      const dataObj = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
      
      const observerFields = ['nguoi_lien_quan', 'related_users', 'observers', 'nguoilienquan'];
      const userIds: number[] = [];
      for (const field of observerFields) {
        const val = dataObj[field];
        if (val !== undefined && val !== null) {
          if (Array.isArray(val)) {
            for (const v of val) {
              const num = Number(v);
              if (!isNaN(num) && num > 0) {
                userIds.push(num);
              }
            }
          } else {
            const num = Number(val);
            if (!isNaN(num) && num > 0) {
              userIds.push(num);
            }
          }
        }
      }
      
      const uniqueIds = Array.from(new Set(userIds)).filter(id => !excludeUserIds.includes(id));
      for (const observerId of uniqueIds) {
        await this.notificationsService.createNotification(
          observerId,
          title,
          message,
        );
      }
    } catch (err) {
      console.error('Error notifying observers:', err);
    }
  }
}
