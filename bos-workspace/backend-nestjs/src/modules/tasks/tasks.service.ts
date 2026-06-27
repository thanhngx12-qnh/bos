// File: src/modules/tasks/tasks.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { paginate, PaginateOptions } from 'src/prisma/prisma.helper';
import { CompleteTaskDto, DelegateTaskDto, BatchCompleteTasksDto } from './dto/task-action.dto';
import { tenantContext } from 'src/prisma/tenant-context';
import { BusinessCalendarService } from '../business-calendar/business-calendar.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly calendarService: BusinessCalendarService,
  ) {}

  // ==========================================
  // 0. ĐỘNG CƠ SINH NHIỆM VỤ (WORKFLOW INTEGRATION)
  // ==========================================

  // Hàm này được gọi trong Prisma Transaction của WorkflowsService
  async createTasksForStep(
    tx: any,
    tenantId: number,
    instanceId: number,
    stepObj: any,
    recordData: any,
    selectedAssigneeId?: number,
  ) {
    if (stepObj.stepType === 'SYSTEM_TASK') return; // Máy làm thì không cần sinh Task con người

    const permissions: any = stepObj.permissions || {};
    let candidateUsers: number[] = [];

    if (selectedAssigneeId) {
      candidateUsers = [selectedAssigneeId];
    } else {
      candidateUsers = permissions.candidateUsers || [];
    }

    if (candidateUsers.length === 0) return;

    // TÍNH TOÁN HẠN CHÓT SLA (Gọi BusinessCalendarService)
    const sla = permissions.sla || {}; // { value: number, unit: 'HOURS' | 'DAYS' }
    const slaValue = Number(sla.value) || 24;
    const slaUnit = (sla.unit || 'HOURS') as 'HOURS' | 'DAYS';

    const estimatedCompletionTime = await this.calendarService.calculateDeadline(
      tenantId,
      new Date(),
      slaValue,
      slaUnit,
    );

    // Giao việc: Mỗi candidateUser sẽ nhận 1 Task độc lập
    for (const userId of candidateUsers) {
      // Kiểm tra xem có cấu hình ApprovalDelegation nào đang hiệu lực cho userId này vắng mặt không
      const now = new Date();
      const delegation = await tx.approvalDelegation.findFirst({
        where: {
          tenantId,
          fromUserId: userId,
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        } as any,
      });

      let actualAssigneeId = userId;
      let assignmentData: any = {};

      if (delegation) {
        actualAssigneeId = delegation.toUserId;
        assignmentData = {
          delegatedFromUserId: userId,
          delegationId: delegation.id,
          delegatedAt: now.toISOString(),
        };
        console.log(
          `[Approval Delegation] User ID ${userId} đang cấu hình ủy quyền vắng mặt. Task phê duyệt được chuyển tiếp sang User ID ${delegation.toUserId} (Delegation ID: ${delegation.id})`,
        );
      }

      await tx.task.create({
        data: {
          tenantId: tenantId,
          instanceId: instanceId,
          stepId: stepObj.id,
          assigneeType: 'USER',
          assigneeId: actualAssigneeId,
          assignmentStrategy: delegation ? 'DELEGATED' : 'STATIC',
          status: 'PENDING',
          estimatedCompletionTime: estimatedCompletionTime,
          assignmentData: assignmentData,
        } as any,
      });
      console.log(
        `[Task Engine] Đã tự động sinh Task cho User ID ${actualAssigneeId} tại Trạm: ${stepObj.name} (SLA: ${slaValue} ${slaUnit}, Hạn chót: ${estimatedCompletionTime.toISOString()})`,
      );
    }
  }

  // Hàm này dọn dẹp các Task khi quy trình đi tiếp:
  // - Task của người thực hiện action => COMPLETED
  // - Task của các ứng viên còn lại => CANCELLED
  async cancelPendingTasks(
    tx: any,
    instanceId: number,
    stepId: number,
    actorUserId?: number,
  ) {
    const completionTime = new Date();

    // Nếu có actorUserId, mark task của họ là COMPLETED trước
    if (actorUserId) {
      const actorTask = await tx.task.findFirst({
        where: {
          instanceId,
          stepId,
          assigneeId: actorUserId,
          status: 'PENDING',
        } as any,
      });

      if (actorTask) {
        const completionSeconds = Math.round(
          (completionTime.getTime() - actorTask.createdAt.getTime()) / 1000,
        );
        await tx.task.update({
          where: { id: actorTask.id } as any,
          data: {
            status: 'COMPLETED',
            actualCompletionTime: completionTime,
            completionTimeSeconds: completionSeconds,
          } as any,
        });
        console.log(
          `[Task Engine] Task #${actorTask.id} của User ${actorUserId} đã COMPLETED tại Trạm ID ${stepId}.`,
        );
      }
    }

    // Cancel toàn bộ PENDING tasks còn lại của bước này (từ các ứng viên khác)
    const result = await tx.task.updateMany({
      where: {
        instanceId,
        stepId,
        status: 'PENDING',
        ...(actorUserId ? { NOT: { assigneeId: actorUserId } } : {}),
      } as any,
      data: { status: 'CANCELLED' } as any,
    });
    if (result.count > 0) {
      console.log(
        `[Task Engine] Đã hủy (CANCEL) ${result.count} task dư thừa tại Trạm ID ${stepId}.`,
      );
    }
  }

  // ==========================================
  // 1. TRUY VẤN VÀ PHÂN TRANG
  // ==========================================
  async findAll(options: PaginateOptions, filters: Record<string, any> = {}) {
    return paginate(this.prisma.task, filters, options, {
      instance: { select: { status: true, recordId: true } },
    });
  }

  async findMyTasks(userId: number, options: PaginateOptions, status?: string) {
    const where: any = { assigneeId: userId };

    // Tab "COMPLETED" => hiển thị cả task COMPLETED và CANCELLED (từ chối)
    if (status === 'COMPLETED') {
      where.status = { in: ['COMPLETED', 'CANCELLED'] };
    } else if (status) {
      where.status = status;
    }

    return paginate(this.prisma.task, where, options, {
      instance: {
        include: {
          record: {
            select: {
              businessCode: true,
              title: true,
              entityId: true,
              data: true,
              status: true,
            },
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.task.findFirst({
      where: { id } as any,
      include: { instance: true },
    });
    if (!task) throw new NotFoundException('Không tìm thấy nhiệm vụ.');
    return task;
  }

  // ==========================================
  // 2. NGHIỆP VỤ XỬ LÝ (COMPLETE & DELEGATE)
  // ==========================================
  async completeTask(taskId: number, userId: number, dto: CompleteTaskDto) {
    const task = await this.findOne(taskId);

    if (task.assigneeId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xử lý nhiệm vụ này.');
    }
    if (task.status !== 'PENDING') {
      throw new BadRequestException('Nhiệm vụ này đã đóng hoặc bị hủy.');
    }

    // TÍNH TOÁN SLA KHI HOÀN THÀNH (Đo lường KPI)
    const completionTime = new Date();
    const completionSeconds = Math.round(
      (completionTime.getTime() - task.createdAt.getTime()) / 1000,
    );

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId } as any,
      data: {
        status: 'COMPLETED',
        actualCompletionTime: completionTime,
        completionTimeSeconds: completionSeconds,
        assignmentData: {
          ...(task.assignmentData as object),
          comment: dto.comment,
        } as any,
      } as any,
    });

    // BẮN SỰ KIỆN CHO EVENT BUS (Để Workflow Engine bắt được và chuyển trạm)
    this.eventEmitter.emit('task.completed', {
      taskId: updatedTask.id,
      instanceId: updatedTask.instanceId,
      stepId: updatedTask.stepId,
      userId: userId,
      comment: dto.comment,
    });

    return updatedTask;
  }

  async batchCompleteTasks(userId: number, dto: BatchCompleteTasksDto) {
    const results: any[] = [];
    const errors: any[] = [];

    for (const taskId of dto.taskIds) {
      try {
        const result = await this.completeTask(taskId, userId, { comment: dto.comment });
        results.push(result);
      } catch (err) {
        errors.push({ taskId, message: err.message });
      }
    }

    return {
      successCount: results.length,
      failedCount: errors.length,
      results: results.map((r) => r.id),
      errors,
    };
  }

  async delegateTask(taskId: number, userId: number, dto: DelegateTaskDto) {
    const task = await this.findOne(taskId);
    if (task.assigneeId !== userId)
      throw new ForbiddenException(
        'Chỉ người được giao mới có quyền ủy quyền.',
      );
    if (task.status !== 'PENDING')
      throw new BadRequestException('Nhiệm vụ không còn hiệu lực.');

    return this.prisma.task.update({
      where: { id: taskId } as any,
      data: {
        assigneeId: dto.assigneeId,
        assignmentData: {
          ...(task.assignmentData as object),
          delegatedBy: userId,
          delegationReason: dto.reason,
        } as any,
      } as any,
    });
  }

  // ==========================================
  // 3. THỐNG KÊ KPI CHO ADMIN (TASK ANALYTICS)
  // ==========================================
  async getTaskAnalytics() {
    const store = tenantContext.getStore();
    const tenantId = store?.tenantId;

    const stats = await this.prisma.task.groupBy({
      by: ['status'],
      where: { tenantId } as any,
      _count: { id: true },
      _avg: { completionTimeSeconds: true },
    });

    // Phân tích thêm Task trễ hạn (Nếu có estimatedCompletionTime)
    const overdueCount = await this.prisma.task.count({
      where: {
        tenantId,
        status: 'PENDING',
        estimatedCompletionTime: { lt: new Date() },
      } as any,
    });

    return {
      statusBreakdown: stats.map((s) => ({
        status: s.status,
        count: s._count.id,
        avgCompletionSeconds: s._avg.completionTimeSeconds || 0,
      })),
      overdueCount,
    };
  }
}
