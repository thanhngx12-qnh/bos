const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = 'postgresql://postgres:postgres@localhost:5435/bos_core_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.approvalDelegation.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
  console.log(`Deactivated ${result.count} active delegation rules.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
