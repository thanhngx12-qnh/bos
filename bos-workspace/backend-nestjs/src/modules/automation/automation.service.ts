// File: src/modules/automation/automation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConditionEvaluatorService } from 'src/core/engines/condition-evaluator.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { DomainEvent } from 'src/core/interfaces/domain-event.interface';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
    @InjectQueue('webhook-queue') private readonly webhookQueue: Queue,
  ) {}

  // Lắng nghe sự kiện tạo mới và cập nhật bản ghi
  @OnEvent('record.created')
  async handleRecordCreated(event: DomainEvent) {
    await this.processAutomationRules('record.created', event);
  }

  @OnEvent('record.updated')
  async handleRecordUpdated(event: DomainEvent) {
    await this.processAutomationRules('record.updated', event);
  }

  /**
   * ĐỘNG CƠ XỬ LÝ QUY TẮC TỰ ĐỘNG HÓA
   */
  private async processAutomationRules(eventName: string, event: DomainEvent) {
    const tenantId = event.metadata.tenantId;

    try {
      // 1. Tìm tất cả các Automation Rule đang Active của Tenant này cho Event tương ứng
      const rules = await this.prisma.automationRule.findMany({
        where: {
          tenantId: tenantId,
          isActive: true,
          eventDef: { code: eventName },
        } as any,
      });

      if (rules.length === 0) return;

      // 2. Chuẩn bị dữ liệu Context để đánh giá điều kiện
      // Với record.created, payload chính là record. Với record.updated, payload có updatedRecord
      const recordContext = event.payload.updatedRecord || event.payload;
      const recordData = recordContext.data || {};

      // 3. Duyệt qua từng Rule và Đánh giá (Evaluate)
      for (const rule of rules) {
        const conditions: any = rule.conditions || {};

        // Gọi "Bộ não Logic" để kiểm tra điều kiện
        const isMatch = this.conditionEvaluator.evaluate(
          conditions,
          recordData,
        );

        if (isMatch) {
          this.logger.log(
            `[Automation Engine] Rule '${rule.name}' MATCHED! Đang thực thi Actions...`,
          );
          await this.executeActions(
            rule.actions,
            recordContext,
            event.metadata,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `[Automation Engine] Lỗi khi xử lý rule cho event ${eventName}: ${error.message}`,
      );
    }
  }

  /**
   * ĐỘNG CƠ THỰC THI HÀNH ĐỘNG (ACTIONS EXECUTOR)
   */
  private async executeActions(
    actionsConfig: any,
    recordContext: any,
    metadata: any,
  ) {
    if (!Array.isArray(actionsConfig)) return;

    for (const action of actionsConfig) {
      try {
        switch (action.type) {
          case 'SEND_EMAIL':
            await this.emailQueue.add(
              'send-dynamic-email', // Cần cấu hình thêm processor này trong mailer nếu muốn gửi mail tùy biến
              {
                recipientEmail: action.to,
                subject: action.subject,
                body: action.body,
                recordData: recordContext.data,
              },
              { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
            );
            this.logger.log(
              `[Automation Action] Đã xếp hàng gửi Email tới ${action.to}`,
            );
            break;

          case 'SEND_WEBHOOK':
            await this.webhookQueue.add(
              'send-webhook',
              {
                webhookUrl: action.url,
                payload: {
                  event: 'AUTOMATION_TRIGGERED',
                  source: 'Automation Engine',
                  recordData: recordContext.data,
                  businessCode: recordContext.businessCode,
                  timestamp: new Date().toISOString(),
                },
              },
              { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
            );
            this.logger.log(
              `[Automation Action] Đã xếp hàng gửi Webhook tới ${action.url}`,
            );
            break;

          case 'CREATE_TASK':
            // Giao một nhiệm vụ độc lập (không thuộc quy trình duyệt nào)
            await this.prisma.task.create({
              data: {
                tenantId: metadata.tenantId,
                // SỬA LỖI: Bỏ qua instanceId và stepId (để Prisma tự gán NULL)
                assigneeType: 'USER',
                assigneeId: action.assigneeId,
                assignmentStrategy: 'STATIC',
                assignmentData: {
                  title: action.taskTitle,
                  description: action.taskDescription,
                } as any,
                status: 'PENDING',
              } as any,
            });
            this.logger.log(
              `[Automation Action] Đã tạo Task độc lập cho User ID ${action.assigneeId}`,
            );
            break;

          default:
            this.logger.warn(
              `[Automation Action] Loại hành động không hỗ trợ: ${action.type}`,
            );
        }
      } catch (error) {
        this.logger.error(
          `[Automation Action] Lỗi khi thực thi action ${action.type}: ${error.message}`,
        );
      }
    }
  }
}
