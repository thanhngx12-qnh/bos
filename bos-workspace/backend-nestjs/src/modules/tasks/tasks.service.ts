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
import { CompleteTaskDto, DelegateTaskDto } from './dto/task-action.dto';
import { tenantContext } from 'src/prisma/tenant-context';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private eventEmitter: EventEmitter2,
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
  ) {
    if (stepObj.stepType === 'SYSTEM_TASK') return; // Máy làm thì không cần sinh Task con người

    const permissions: any = stepObj.permissions || {};
    const candidateUsers: number[] = permissions.candidateUsers || [];

    if (candidateUsers.length === 0) return;

    // TÍNH TOÁN HẠN CHÓT SLA (Tạm thời mock cộng thêm 24 giờ. Sau này sẽ gọi BusinessCalendarService)
    const estimatedCompletionTime = new Date();
    estimatedCompletionTime.setHours(estimatedCompletionTime.getHours() + 24);

    // Giao việc: Mỗi candidateUser sẽ nhận 1 Task độc lập
    for (const userId of candidateUsers) {
      await tx.task.create({
        data: {
          tenantId: tenantId,
          instanceId: instanceId,
          stepId: stepObj.id,
          assigneeType: 'USER',
          assigneeId: userId,
          assignmentStrategy: 'STATIC',
          status: 'PENDING',
          estimatedCompletionTime: estimatedCompletionTime,
          assignmentData: {} as any,
        } as any,
      });
      console.log(
        `[Task Engine] Đã tự động sinh Task cho User ID ${userId} tại Trạm: ${stepObj.name}`,
      );
    }
  }

  // Hàm này dọn dẹp các Task rác khi quy trình đi tiếp (Duyệt đại diện OR-Gate)
  async cancelPendingTasks(tx: any, instanceId: number, stepId: number) {
    const result = await tx.task.updateMany({
      where: {
        instanceId: instanceId,
        stepId: stepId,
        status: 'PENDING',
      } as any,
      data: {
        status: 'CANCELLED',
      } as any,
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
    if (status) where.status = status;

    return paginate(this.prisma.task, where, options, {
      instance: {
        include: { record: { select: { businessCode: true, title: true } } },
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
