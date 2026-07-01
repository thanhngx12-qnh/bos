// File: src/modules/tasks/tasks.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { tenantContext } from 'src/prisma/tenant-context'; // <-- IMPORT CONTEXT
import { WorkflowsService } from '../workflows/workflows.service';

@Injectable()
export class TasksScheduler {
  private readonly logger = new Logger(TasksScheduler.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleOverdueTasks() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    // this.logger.log(
    //   `[SLA Alert Worker] Bắt đầu quét tác vụ quá hạn trên toàn hệ thống...`,
    // );

    try {
      // 1. Quét tất cả các Tenant đang hoạt động
      const tenants = await this.prisma.tenant.findMany({
        where: { status: 'ACTIVE' },
      });

      for (const tenant of tenants) {
        // 2. Chạy logic trong ngữ cảnh (Context) của từng Tenant
        await tenantContext.run({ tenantId: tenant.id }, async () => {
          // this.logger.log(
          //   `>> Đang quét cho Tenant ID: ${tenant.id} - ${tenant.name}`,
          // );

          const overdueTasks = await this.prisma.task.findMany({
            where: {
              status: 'PENDING',
              estimatedCompletionTime: { lt: new Date() },
            } as any,
            include: {
              instance: { include: { record: true } },
            } as any,
          });

          if (overdueTasks.length === 0) return;

          this.logger.warn(
            `[SLA Alert Worker] Tenant ${tenant.id} phát hiện ${overdueTasks.length} nhiệm vụ quá hạn. Đang phát lệnh báo động...`,
          );

          for (const task of overdueTasks) {
            await this.prisma.task.update({
              where: { id: task.id } as any,
              data: { status: 'OVERDUE' } as any,
            });

            if (task.assigneeId) {
              const recordCode =
                (task.instance as any).record?.businessCode ||
                `#${(task.instance as any).record?.id}`;

              await this.notificationsService.createNotification(
                task.assigneeId,
                '🚨 CẢNH BÁO: NHIỆM VỤ QUÁ HẠN SLA',
                `Nhiệm vụ phê duyệt phiếu [${recordCode}] của bạn đã QUÁ HẠN. Vui lòng xử lý ngay lập tức!`,
                {
                  emailJobName: 'send-new-approval-request',
                  emailPayload: {
                    recipientName: 'Thành viên',
                    recordCode: recordCode,
                    initiatorName: 'Hệ thống SLA',
                    stepName: 'CẢNH BÁO QUÁ HẠN',
                  },
                },
              );
            }

            // Tự động chuyển trạm (Auto-Escalation)
            if (task.instanceId && task.stepId) {
              try {
                const step = await this.prisma.workflowStep.findUnique({
                  where: { id: task.stepId },
                  include: {
                    transitionsOut: {
                      include: {
                        toStep: true,
                      },
                    },
                  },
                });

                if (step) {
                  const permissions = (step.permissions || {}) as any;
                  const sla = permissions.sla || {};
                  const overflowAction = sla.overflowAction || 'NONE';

                  if (overflowAction === 'AUTO_SKIP' || overflowAction === 'AUTO_REJECT') {
                    const stripAccents = (str: string): string => {
                      return str
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/đ/g, 'd')
                        .replace(/Đ/g, 'd')
                        .toLowerCase();
                    };

                    const transitions = step.transitionsOut || [];
                    let targetTransition: any = null;

                    if (overflowAction === 'AUTO_SKIP') {
                      targetTransition = transitions.find((t: any) => {
                        const logic = (t.conditionLogic || {}) as any;
                        const actionLabel = stripAccents(logic.actionLabel || '');
                        const toStepName = stripAccents(t.toStep?.name || '');
                        const isReject =
                          actionLabel.includes('tu choi') ||
                          actionLabel.includes('reject') ||
                          actionLabel.includes('khong duyet') ||
                          actionLabel.includes('khong phe duyet') ||
                          toStepName.includes('tu choi') ||
                          toStepName.includes('reject') ||
                          toStepName.includes('khong duyet') ||
                          toStepName.includes('khong phe duyet');
                        return !isReject;
                      });
                    } else if (overflowAction === 'AUTO_REJECT') {
                      targetTransition = transitions.find((t: any) => {
                        const logic = (t.conditionLogic || {}) as any;
                        const actionLabel = stripAccents(logic.actionLabel || '');
                        const toStepName = stripAccents(t.toStep?.name || '');
                        const isReject =
                          actionLabel.includes('tu choi') ||
                          actionLabel.includes('reject') ||
                          actionLabel.includes('khong duyet') ||
                          actionLabel.includes('khong phe duyet') ||
                          toStepName.includes('tu choi') ||
                          toStepName.includes('reject') ||
                          toStepName.includes('khong duyet') ||
                          toStepName.includes('khong phe duyet');
                        return isReject;
                      });
                    }

                    if (targetTransition) {
                      const transLogic = (targetTransition.conditionLogic || {}) as any;
                      const actionLabel = transLogic.actionLabel || (overflowAction === 'AUTO_SKIP' ? 'Tự động duyệt qua SLA' : 'Tự động từ chối qua SLA');
                      const comment = `Hệ thống tự động thực hiện chuyển trạm [${overflowAction}] do trễ hạn SLA.`;
                      await this.workflowsService.handleSystemAutoTransition(
                        task.instanceId,
                        targetTransition.id,
                        actionLabel,
                        comment,
                      );
                      this.logger.log(
                        `[SLA Auto-Escalation] Đã tự động chuyển trạm cho Task #${task.id} (Instance #${task.instanceId}) -> Trạm kế tiếp: ${targetTransition.toStep?.name}`,
                      );
                    } else {
                      this.logger.warn(
                        `[SLA Auto-Escalation] Không tìm thấy Đường nối (Transition) phù hợp với hành động ${overflowAction} cho Task #${task.id}`,
                      );
                    }
                  }
                }
              } catch (err) {
                this.logger.error(
                  `[SLA Auto-Escalation] Lỗi khi chuyển trạm tự động cho Task #${task.id}: ${err.message}`,
                );
              }
            }
          }
        });
      }
    } catch (error) {
      this.logger.error(
        `[SLA Alert Worker] Lỗi khi quét tác vụ quá hạn: ${error.message}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  @Cron('0 0 16 * * *')
  async handleDailyPowerPlugShiftCheck() {
    this.logger.log(`[Power Plug Daily Worker] Bắt đầu tự động chốt ca lúc 16h00...`);
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { status: 'ACTIVE' },
      });

      for (const tenant of tenants) {
        await tenantContext.run({ tenantId: tenant.id }, async () => {
          const query = `
            SELECT id, business_code as "businessCode", data 
            FROM records 
            WHERE tenant_id = $1 
              AND deleted_at IS NULL 
              AND (data->>'SO_CONTAINER' IS NOT NULL OR data->>'so_container' IS NOT NULL)
              AND (data->>'THOI_GIAN_CAM' IS NOT NULL OR data->>'thoi_gian_cam' IS NOT NULL)
              AND (
                (data->>'THOI_GIAN_RUT' IS NULL OR data->>'THOI_GIAN_RUT' = '')
                AND (data->>'thoi_gian_rut' IS NULL OR data->>'thoi_gian_rut' = '')
              )
          `;
          const activePlugs = await this.prisma.$queryRawUnsafe<any[]>(
            query,
            tenant.id,
          );

          const firstUser = await this.prisma.user.findFirst({
            where: { tenantId: tenant.id },
          });
          const systemUserId = firstUser ? firstUser.id : 1;

          this.logger.log(
            `Tenant ID: ${tenant.id} - ${tenant.name}: Tìm thấy ${activePlugs.length} container đang cắm điện lúc 16h00.`,
          );

          for (const plug of activePlugs) {
            const data = plug.data as any;
            const soCont = data.SO_CONTAINER;
            const camTime = new Date(data.THOI_GIAN_CAM).getTime();
            const elapsedHours = parseFloat(((Date.now() - camTime) / 3600000).toFixed(2));

            this.logger.log(
              `>> Cont lạnh: ${soCont} (Mã: ${plug.businessCode}) đã cắm ${elapsedHours} giờ tính đến 16h00.`,
            );

            await this.prisma.systemAuditLog.create({
              data: {
                tenantId: tenant.id,
                userId: systemUserId,
                action: 'DAILY_POWER_PLUG_CHECK',
                resource: 'Record',
                resourceId: plug.id,
                payload: {
                  soContainer: soCont,
                  hoursElapsed: elapsedHours,
                  timestamp: new Date().toISOString(),
                },
                ipAddress: '127.0.0.1',
              },
            });
          }
        });
      }
    } catch (err) {
      this.logger.error(`[Power Plug Daily Worker] Lỗi chốt ca: ${err.message}`);
    }
  }
}
