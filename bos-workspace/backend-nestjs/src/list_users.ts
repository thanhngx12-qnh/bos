import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/bos_core_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== USERS ===');
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' }
  });
  users.forEach(u => {
    console.log(`User #${u.id} | email=${u.email} | fullName=${u.fullName} | userType=${u.userType} | tenantId=${u.tenantId}`);
  });

  console.log('=== TENANTS ===');
  const tenants = await prisma.tenant.findMany({
    orderBy: { id: 'asc' }
  });
  tenants.forEach(t => {
    console.log(`Tenant #${t.id} | name=${t.name} | code=${t.code}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
