import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConditionEvaluatorService } from 'src/core/engines/condition-evaluator.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { DomainEvent } from 'src/core/interfaces/domain-event.interface';
import { RecordsService } from '../records/records.service';
import { WorkflowsService } from '../workflows/workflows.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
    @InjectQueue('webhook-queue') private readonly webhookQueue: Queue,
    @InjectQueue('automation-queue') private readonly automationQueue: Queue,
    private readonly recordsService: RecordsService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  // Lắng nghe sự kiện tạo mới và cập nhật bản ghi
  @OnEvent('record.created')
  async handleRecordCreated(event: DomainEvent) {
    await this.automationQueue.add('process-rule', { eventName: 'record.created', event });
  }

  @OnEvent('record.updated')
  async handleRecordUpdated(event: DomainEvent) {
    await this.automationQueue.add('process-rule', { eventName: 'record.updated', event });
  }

  @OnEvent('workflow.completed')
  async handleWorkflowCompleted(event: DomainEvent) {
    await this.automationQueue.add('process-rule', { eventName: 'workflow.completed', event });
  }

  /**
   * ĐỘNG CƠ XỬ LÝ QUY TẮC TỰ ĐỘNG HÓA
   */
  async processAutomationRules(eventName: string, event: DomainEvent) {
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
      const recordData = recordContext.recordData || recordContext.data || {};

      // 3. Duyệt qua từng Rule và Đánh giá (Evaluate)
      for (const rule of rules) {
        const conditions: any = rule.conditions || {};

        const evaluationContext = {
          ...recordData,
          entityId: recordContext.entityId,
          workflowId: recordContext.workflowId,
        };

        // Gọi "Bộ não Logic" để kiểm tra điều kiện
        const isMatch = this.conditionEvaluator.evaluate(
          conditions,
          evaluationContext,
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

    const sourceData = recordContext.recordData || recordContext.data || {};

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
                recordData: sourceData,
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
                  recordData: sourceData,
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

          // Tìm đến khối case "CREATE_TASK" bên trong hàm executeActions và thay thế bằng đoạn mã này:
          case 'CREATE_TASK':
            // BẢN VÁ BẢO MẬT: Kiểm tra chéo (Cross-tenant validation) để chống rò rỉ dữ liệu chéo Tenant
            const targetUser = await this.prisma.user.findFirst({
              where: {
                id: action.assigneeId,
                tenantId: metadata.tenantId,
              } as any,
            });

            if (!targetUser) {
              this.logger.error(
                `[Automation Action] Chặn tạo Task: User ID ${action.assigneeId} không thuộc về Tenant ID ${metadata.tenantId}. Nguy cơ rò rỉ chéo dữ liệu.`,
              );
              break;
            }

            // Giao một nhiệm vụ độc lập (không thuộc quy trình duyệt nào)
            await this.prisma.task.create({
              data: {
                tenantId: metadata.tenantId,
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

          case 'START_WORKFLOW':
            // 1. Kiểm tra chéo bảo mật: Biểu mẫu đích (targetEntityId) có thuộc Tenant không
            const targetEntity = await this.prisma.entity.findFirst({
              where: {
                id: action.targetEntityId,
                tenantId: metadata.tenantId,
              } as any,
            });

            if (!targetEntity) {
              this.logger.error(
                `[Automation Action] Chặn START_WORKFLOW: Entity ID ${action.targetEntityId} không thuộc Tenant ID ${metadata.tenantId}. Nguy cơ rò rỉ chéo dữ liệu.`,
              );
              break;
            }

            // 2. Thực hiện ánh xạ dữ liệu (Field Mapping)
            const mapping = action.fieldMapping || {};
            const targetData: Record<string, any> = {};

            for (const [targetFieldCode, mapConfig] of Object.entries(mapping)) {
              if (typeof mapConfig === 'string') {
                // Ánh xạ trực tiếp cho trường đơn hoặc bảng con cùng cấu trúc
                targetData[targetFieldCode] = sourceData[mapConfig];
              } else if (mapConfig && typeof mapConfig === 'object') {
                // Ánh xạ cột cho bảng con khác cấu trúc cột (Subtable Column Mapping)
                const sourceFieldCode = (mapConfig as any).sourceField;
                const colMapping = (mapConfig as any).columnMapping || {};
                const sourceRows = sourceData[sourceFieldCode];

                if (Array.isArray(sourceRows)) {
                  targetData[targetFieldCode] = sourceRows.map((row: any) => {
                    const transformedRow: Record<string, any> = {};
                    for (const [targetColCode, sourceColCode] of Object.entries(colMapping)) {
                      if (typeof sourceColCode === 'string') {
                        transformedRow[targetColCode] = row[sourceColCode];
                      }
                    }
                    // Bảo toàn STT nếu có, hoặc để sinh tự động
                    if (row.stt) transformedRow.stt = row.stt;
                    return transformedRow;
                  });
                } else {
                  targetData[targetFieldCode] = [];
                }
              }
            }

            // 3. Xác định User ID thực hiện (Sử dụng initiatorId của quy trình nguồn hoặc actorId)
            const creatorId = recordContext.initiatorId || metadata.userId;
            if (!creatorId) {
              this.logger.error(
                `[Automation Action] Chặn START_WORKFLOW: Không tìm thấy User ID hợp lệ để khởi tạo bản ghi mới.`,
              );
              break;
            }

            this.logger.log(
              `[Automation Action] Đang tự động tạo Record mới cho Entity: ${targetEntity.name} (ID: ${targetEntity.id})...`,
            );

            // 4. Gọi RecordsService để tạo bản ghi an toàn (tính toán công thức, sinh mã, validate)
            const newRecord = await this.recordsService.create(creatorId, {
              entityId: targetEntity.id,
              data: targetData,
            });

            this.logger.log(
              `[Automation Action] Đã tạo thành công Record #${newRecord.id} | businessCode: ${newRecord.businessCode}`,
            );

            // 5. Nếu cấu hình targetWorkflowId có chỉ định, tìm phiên bản đã xuất bản (PUBLISHED) để chạy
            if (action.targetWorkflowId) {
              const targetWorkflow = await this.prisma.workflow.findFirst({
                where: {
                  id: action.targetWorkflowId,
                  entityId: targetEntity.id,
                  tenantId: metadata.tenantId,
                } as any,
                include: {
                  versions: {
                    where: { status: 'PUBLISHED' },
                    orderBy: { version: 'desc' },
                  },
                },
              });

              const publishedVersion = targetWorkflow?.versions?.[0];
              if (publishedVersion) {
                this.logger.log(
                  `[Automation Action] Đang khởi chạy Workflow Instance cho Record mới (Workflow: ${targetWorkflow.name}, Version ID: ${publishedVersion.id})...`,
                );

                await this.workflowsService.startInstance(creatorId, {
                  recordId: newRecord.id,
                  versionId: publishedVersion.id,
                });

                this.logger.log(
                  `[Automation Action] Đã khởi chạy Workflow thành công cho Record mới!`,
                );
              } else {
                this.logger.warn(
                  `[Automation Action] Không tự động chạy quy trình vì Workflow ID ${action.targetWorkflowId} không có phiên bản nào ở trạng thái PUBLISHED.`,
                );
              }
            }
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

  async findEvents(tenantId: number) {
    let events = await this.prisma.eventDefinition.findMany({
      where: { tenantId } as any,
    });

    if (events.length === 0) {
      const defaults = [
        {
          code: 'record.created',
          name: 'Khi hồ sơ được tạo',
          schema: {},
        },
        {
          code: 'record.updated',
          name: 'Khi hồ sơ được cập nhật',
          schema: {},
        },
        {
          code: 'workflow.completed',
          name: 'Khi quy trình hoàn thành',
          schema: {},
        },
      ];

      for (const d of defaults) {
        await this.prisma.eventDefinition.create({
          data: {
            tenantId,
            code: d.code,
            name: d.name,
            schema: d.schema as any,
          } as any,
        });
      }

      events = await this.prisma.eventDefinition.findMany({
        where: { tenantId } as any,
      });
    }

    return events;
  }

  async findAll(tenantId: number) {
    return this.prisma.automationRule.findMany({
      where: { tenantId } as any,
      include: {
        eventDef: { select: { id: true, name: true, code: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(tenantId: number, id: number) {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id, tenantId } as any,
      include: {
        eventDef: { select: { id: true, name: true, code: true } },
      },
    });
    if (!rule) throw new NotFoundException('Không tìm thấy quy tắc tự động hóa.');
    return rule;
  }

  async create(tenantId: number, dto: CreateRuleDto) {
    return this.prisma.automationRule.create({
      data: {
        tenantId,
        name: dto.name,
        eventId: dto.eventId,
        conditions: dto.conditions || {},
        actions: dto.actions || [],
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      } as any,
    });
  }

  async update(tenantId: number, id: number, dto: UpdateRuleDto) {
    await this.findOne(tenantId, id);
    return this.prisma.automationRule.update({
      where: { id } as any,
      data: {
        name: dto.name,
        eventId: dto.eventId,
        conditions: dto.conditions ?? undefined,
        actions: dto.actions ?? undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      } as any,
    });
  }

  async remove(tenantId: number, id: number) {
    await this.findOne(tenantId, id);
    return this.prisma.automationRule.delete({
      where: { id } as any,
    });
  }
}
