import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = 'postgresql://postgres:postgres@localhost:5435/bos_core_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenantId = 12;
  const userId = 6;

  console.log('🌱 Starting record seeder for Tenant 12...');

  // Fetch all entities for tenant 12
  const entities = await prisma.entity.findMany({
    where: { tenantId }
  });

  for (const entity of entities) {
    console.log(`Processing Entity: ${entity.name} (Code: ${entity.code})`);

    // Get published version or first version
    const version = await prisma.entityVersion.findFirst({
      where: { entityId: entity.id, tenantId },
      orderBy: { version: 'desc' }
    });

    if (!version) {
      console.log(`   -> No version found for ${entity.code}. Skipping.`);
      continue;
    }

    // Get fields registry
    const fieldsSnapshot = version.fieldsSnapshot as any[] || [];
    const fieldCodes = fieldsSnapshot.map(f => f.code);
    const fields = await prisma.fieldRegistry.findMany({
      where: { tenantId, code: { in: fieldCodes } }
    });

    // Check if workflow exists
    const workflow = await prisma.workflow.findFirst({
      where: { entityId: entity.id, tenantId }
    });

    const wfVersion = workflow ? await prisma.workflowVersion.findFirst({
      where: { workflowId: workflow.id, status: 'PUBLISHED' }
    }) || await prisma.workflowVersion.findFirst({
      where: { workflowId: workflow.id }
    }) : null;

    const firstStep = wfVersion ? await prisma.workflowStep.findFirst({
      where: { versionId: wfVersion.id },
      orderBy: { orderIndex: 'asc' }
    }) : null;

    const approvedStep = wfVersion ? await prisma.workflowStep.findFirst({
      where: { versionId: wfVersion.id, stepType: 'SYSTEM_TASK', name: { contains: 'hoàn' } }
    }) || await prisma.workflowStep.findFirst({
      where: { versionId: wfVersion.id, stepType: 'SYSTEM_TASK' }
    }) : null;

    const rejectedStep = wfVersion ? await prisma.workflowStep.findFirst({
      where: { versionId: wfVersion.id, name: { contains: 'Từ chối' } }
    }) : null;

    const generateMockData = (index: number) => {
      const data: any = {};
      for (const field of fields) {
        if (field.code === 'bien_so_xe') {
          data[field.code] = `15C-${10000 + index}`;
        } else if (field.code === 'so_container') {
          data[field.code] = `MSKU${2000000 + index}`;
        } else if (field.code === 'chu_hang') {
          data[field.code] = index % 2 === 0 ? 'Tập đoàn Hòa Phát' : 'Tổng công ty Hoa Sen';
        } else if (field.code === 'loai_hinh') {
          data[field.code] = index % 2 === 0 ? 'Nhập' : 'Xuất';
        } else if (field.code === 'gio_vao') {
          data[field.code] = new Date(Date.now() - 3600000 * 2).toISOString();
        } else if (field.code === 'request_date') {
          data[field.code] = new Date().toISOString().split('T')[0];
        } else if (field.code === 'supplier_name') {
          data[field.code] = 'Nhà cung cấp thép Việt-Nhật';
        } else if (field.code === 'payment_method') {
          data[field.code] = 'Chuyển khoản';
        } else if (field.code === 'account_number') {
          data[field.code] = '1903456789012';
        } else if (field.code === 'bank_name') {
          data[field.code] = 'Techcombank';
        } else if (field.code === 'has_contract') {
          data[field.code] = true;
        } else if (field.code === 'contract_number') {
          data[field.code] = `CON-2026-${index}`;
        } else if (field.code === 'total_payment') {
          data[field.code] = 150000000;
        } else if (field.code === 'request_type') {
          data[field.code] = 'Sửa chữa cải tạo lớn';
        } else if (field.code === 'products_list') {
          data[field.code] = [
            { stt: 1, product_name: 'Bảo trì trạm cân', quantity: 1, price: 150000000, amount: 150000000 }
          ];
        } else {
          // Fallback based on type
          if (field.type === 'NUMBER') data[field.code] = 1000;
          else if (field.type === 'CHECKBOX') data[field.code] = false;
          else if (field.type === 'DATE' || field.type === 'DATE_TIME') data[field.code] = new Date().toISOString();
          else data[field.code] = `Giá trị mẫu ${field.name}`;
        }
      }
      return data;
    };

    // Seed 3 records per entity: 1 pending, 1 completed, 1 rejected
    const recordsToSeed = [
      { status: 'IN_PROGRESS', label: 'đang xử lý' },
      { status: 'COMPLETED', label: 'đã hoàn thành' },
      { status: 'REJECTED', label: 'bị từ chối' }
    ];

    let index = 1;
    for (const item of recordsToSeed) {
      const businessCode = `${entity.code.toUpperCase()}-${String(100 + index)}`;
      const title = `Hồ sơ ${entity.name} mẫu - ${item.label}`;

      const recStatus = item.status === 'REJECTED' ? 'REJECTED' : item.status === 'COMPLETED' ? 'APPROVED' : 'DRAFT';

      const record = await prisma.record.create({
        data: {
          tenantId,
          entityId: entity.id,
          metadataVersionId: version.id,
          businessCode,
          title,
          status: recStatus,
          createdById: userId,
          data: generateMockData(index)
        }
      });

      if (workflow && wfVersion && firstStep) {
        const currentStep = item.status === 'IN_PROGRESS' ? firstStep.id : (item.status === 'REJECTED' && rejectedStep ? rejectedStep.id : (approvedStep ? approvedStep.id : firstStep.id));

        const instance = await prisma.workflowInstance.create({
          data: {
            tenantId,
            versionId: wfVersion.id,
            recordId: record.id,
            currentStepId: currentStep,
            status: item.status
          }
        });

        // Create log
        await prisma.workflowLog.create({
          data: {
            instanceId: instance.id,
            stepId: firstStep.id,
            userId,
            action: 'START',
            comment: 'Kích hoạt luồng thử nghiệm mẫu.'
          }
        });

        if (item.status !== 'IN_PROGRESS') {
          await prisma.workflowLog.create({
            data: {
              instanceId: instance.id,
              stepId: firstStep.id,
              userId,
              action: item.status === 'COMPLETED' ? 'APPROVE' : 'REJECT',
              comment: item.status === 'COMPLETED' ? 'Duyệt hoàn tất mẫu' : 'Từ chối mẫu'
            }
          });
        }

        // Create task
        await prisma.task.create({
          data: {
            tenantId,
            instanceId: instance.id,
            stepId: firstStep.id,
            assignmentStrategy: 'STATIC',
            assignmentData: {},
            assigneeType: 'USER',
            assigneeId: userId,
            status: item.status === 'IN_PROGRESS' ? 'PENDING' : 'COMPLETED',
            estimatedCompletionTime: new Date(Date.now() + 86400000)
          }
        });
      }

      index++;
    }
  }

  console.log('✅ Seeding mock records successfully completed!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
