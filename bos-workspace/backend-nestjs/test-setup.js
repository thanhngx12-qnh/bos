// File: test-setup.js
// Seed script để tạo dữ liệu kiểm thử đầy đủ cho tất cả trạng thái workflow
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = 'postgresql://postgres:postgres@localhost:5435/bos_core_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenantId = 12;
  const userId = 6;
  const entityId = 2;
  const versionId = 1;
  const step1Id = 1;

  console.log('🧹 Cleaning up existing mock data...');
  await prisma.task.deleteMany({ where: { tenantId } });
  await prisma.workflowLog.deleteMany({ where: { instance: { tenantId } } });
  await prisma.workflowInstance.deleteMany({ where: { tenantId } });
  await prisma.workflowTransition.deleteMany({
    where: {
      OR: [
        { fromStepId: step1Id },
        { fromStep: { version: { workflow: { tenantId } } } }
      ]
    }
  });
  await prisma.workflowStep.deleteMany({
    where: {
      id: { not: step1Id },
      versionId
    }
  });
  await prisma.record.deleteMany({ where: { tenantId } });

  console.log('🔧 Updating step 1 permissions (assignee = userId 6)...');
  await prisma.workflowStep.update({
    where: { id: step1Id },
    data: {
      permissions: {
        candidateUsers: [userId],
        approverType: 'SINGLE'
      }
    }
  });

  console.log('📋 Creating Approve / Reject destination steps...');
  const approvedStep = await prisma.workflowStep.create({
    data: {
      versionId,
      name: 'Phê duyệt hoàn tất',
      stepType: 'SYSTEM_TASK',
      orderIndex: 2,
      permissions: {}
    }
  });

  const rejectedStep = await prisma.workflowStep.create({
    data: {
      versionId,
      name: 'Từ chối / Khóa',
      stepType: 'SYSTEM_TASK',
      orderIndex: 3,
      permissions: {}
    }
  });

  console.log('🔀 Creating transitions (Approve / Reject)...');
  const transApprove = await prisma.workflowTransition.create({
    data: {
      fromStepId: step1Id,
      toStepId: approvedStep.id,
      conditionLogic: { actionLabel: 'Đồng ý duyệt' }
    }
  });

  const transReject = await prisma.workflowTransition.create({
    data: {
      fromStepId: step1Id,
      toStepId: rejectedStep.id,
      conditionLogic: { actionLabel: 'Từ chối hồ sơ' }
    }
  });

  console.log('📂 Fetching entity fields for mock data...');
  const fields = await prisma.fieldRegistry.findMany({ where: { tenantId } });
  const mockData = (prefix = '') => {
    const d = {};
    for (const f of fields) {
      if (f.type === 'NUMBER') d[f.code] = Math.floor(Math.random() * 50000000) + 5000000;
      else if (f.type === 'CHECKBOX') d[f.code] = Math.random() > 0.5;
      else if (f.type === 'DATE') d[f.code] = new Date().toISOString();
      else d[f.code] = `${prefix}${f.name}`;
    }
    return d;
  };

  console.log('📌 Fetching EntityVersion...');
  let version = await prisma.entityVersion.findFirst({ where: { entityId, tenantId } });
  if (!version) {
    version = await prisma.entityVersion.create({
      data: {
        tenantId, entityId, version: 1,
        status: 'PUBLISHED', snapshotHash: 'hash-123',
        fieldsSnapshot: fields
      }
    });
  }

  // =============================================
  // Hàm helper tạo workflow instance + task
  // =============================================
  async function seedWorkflowRecord({ businessCode, title, instanceStatus, taskStatus, logAction, logComment }) {
    const record = await prisma.record.create({
      data: {
        tenantId, entityId,
        metadataVersionId: version.id,
        businessCode,
        title,
        status: instanceStatus === 'REJECTED' ? 'REJECTED' : instanceStatus === 'COMPLETED' ? 'APPROVED' : 'DRAFT',
        currentStepId: step1Id,
        createdById: userId,
        data: mockData(title + ' - ')
      }
    });

    const instance = await prisma.workflowInstance.create({
      data: {
        tenantId, versionId,
        recordId: record.id,
        currentStepId: instanceStatus === 'IN_PROGRESS' ? step1Id : (instanceStatus === 'REJECTED' ? rejectedStep.id : approvedStep.id),
        status: instanceStatus
      }
    });

    // Log khởi động
    await prisma.workflowLog.create({
      data: {
        instanceId: instance.id,
        stepId: step1Id,
        userId,
        action: 'START',
        comment: 'Hệ thống tự động kích hoạt lượt chạy kiểm thử.'
      }
    });

    // Nếu đã có action (approve/reject)
    if (logAction) {
      await prisma.workflowLog.create({
        data: {
          instanceId: instance.id,
          stepId: step1Id,
          userId,
          action: logAction,
          comment: logComment || ''
        }
      });
    }

    const estimatedCompletionTime = new Date();
    estimatedCompletionTime.setHours(estimatedCompletionTime.getHours() + 24);

    const task = await prisma.task.create({
      data: {
        tenantId,
        instanceId: instance.id,
        stepId: step1Id,
        assignmentStrategy: 'STATIC',
        assignmentData: {},
        assigneeType: 'USER',
        assigneeId: userId,
        status: taskStatus,
        estimatedCompletionTime,
        ...(taskStatus !== 'PENDING' ? { actualCompletionTime: new Date() } : {})
      }
    });

    return { record, instance, task };
  }

  // =============================================
  // TẠO DỮ LIỆU MẪU: 2 PENDING + 2 APPROVED + 2 REJECTED
  // =============================================
  console.log('\n🟡 Creating PENDING records (2)...');
  await seedWorkflowRecord({
    businessCode: 'IT-RQ-001',
    title: 'Đơn xin mua thiết bị văn phòng năm 2026',
    instanceStatus: 'IN_PROGRESS',
    taskStatus: 'PENDING',
    logAction: null, logComment: null
  });
  await seedWorkflowRecord({
    businessCode: 'HR-RQ-007',
    title: 'Đề xuất tuyển dụng nhân viên kỹ thuật Q3/2026',
    instanceStatus: 'IN_PROGRESS',
    taskStatus: 'PENDING',
    logAction: null, logComment: null
  });

  console.log('\n✅ Creating APPROVED records (2)...');
  await seedWorkflowRecord({
    businessCode: 'FIN-RQ-003',
    title: 'Thanh toán hóa đơn thuê văn phòng tháng 6',
    instanceStatus: 'COMPLETED',
    taskStatus: 'COMPLETED',
    logAction: 'Đồng ý duyệt',
    logComment: 'Đã kiểm tra chứng từ hợp lệ, đồng ý thanh toán.'
  });
  await seedWorkflowRecord({
    businessCode: 'MKT-RQ-011',
    title: 'Ngân sách marketing chiến dịch hè 2026',
    instanceStatus: 'COMPLETED',
    taskStatus: 'COMPLETED',
    logAction: 'Đồng ý duyệt',
    logComment: 'Kế hoạch chi tiết hợp lý, phê duyệt ngân sách.'
  });

  console.log('\n🔴 Creating REJECTED records (2)...');
  await seedWorkflowRecord({
    businessCode: 'OPS-RQ-022',
    title: 'Đề xuất mua xe tải giao hàng mới',
    instanceStatus: 'REJECTED',
    taskStatus: 'CANCELLED',
    logAction: 'Từ chối hồ sơ',
    logComment: 'Chi phí vượt ngân sách đã được phê duyệt, yêu cầu xem xét lại.'
  });
  await seedWorkflowRecord({
    businessCode: 'HR-RQ-015',
    title: 'Đề xuất tăng lương nhân viên vận hành',
    instanceStatus: 'REJECTED',
    taskStatus: 'CANCELLED',
    logAction: 'Từ chối hồ sơ',
    logComment: 'Chưa đủ thời gian đánh giá, hãy nộp lại sau kỳ review tháng 9.'
  });

  console.log('\n=== ✅ SEED HOÀN TẤT! ===');
  console.log('Đã tạo:');
  console.log('  • 2 hồ sơ đang CHỜ PHÊ DUYỆT (PENDING)');
  console.log('  • 2 hồ sơ ĐÃ PHÊ DUYỆT THÀNH CÔNG (COMPLETED)');
  console.log('  • 2 hồ sơ BỊ TỪ CHỐI (REJECTED)');
  console.log(`  User kiểm thử: ID ${userId}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
