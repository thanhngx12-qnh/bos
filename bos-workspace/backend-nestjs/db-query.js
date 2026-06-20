// File: db-query.js
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = 'postgresql://postgres:postgres@localhost:5435/bos_core_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== RECORDS ===');
  const records = await prisma.record.findMany({
    orderBy: { id: 'desc' }
  });
  records.forEach(r => {
    console.log(`  Record #${r.id} | businessCode=${r.businessCode} | title=${r.title} | status=${r.status}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
