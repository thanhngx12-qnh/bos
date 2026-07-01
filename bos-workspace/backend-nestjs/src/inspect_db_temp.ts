import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = 'postgresql://postgres:postgres@localhost:5435/bos_core_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log('--- Tenants ---');
  console.log(tenants);

  const roles = await prisma.role.findMany();
  console.log('--- Roles ---');
  console.log(roles);

  const users = await prisma.user.findMany();
  console.log('--- Users ---');
  console.log(users.map(u => ({ id: u.id, email: u.email, roleId: u.roleId, fullName: u.fullName })));

  const workflows = await prisma.workflow.findMany({
    include: {
      versions: {
        include: {
          steps: true
        }
      }
    }
  });
  console.log('--- Workflows ---');
  workflows.forEach(w => {
    console.log(`Workflow: ${w.name} (Code: ${w.entityId})`);
    w.versions.forEach(v => {
      console.log(`  Version: ${v.version} (Status: ${v.status})`);
      v.steps.forEach(s => {
        console.log(`    Step: ${s.name} (ID: ${s.id}, Config: ${JSON.stringify(s.permissions)})`);
      });
    });
  });

  const latestTasks = await prisma.task.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('--- Latest Tasks ---');
  console.log(latestTasks);
}

main().catch(console.error).finally(() => prisma.$disconnect());
