import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/bos_core_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🧹 1. Wiping all tables and resetting sequences...');
  
  // Get all table names in public schema
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';
  `;

  for (const { tablename } of tablenames) {
    console.log(`   -> Truncating table: ${tablename}`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE;`);
  }

  console.log('✅ All tables truncated and sequences reset!');

  console.log('🏢 2. Seeding default Tenants...');
  
  await prisma.tenant.create({
    data: {
      id: 12,
      name: 'Công ty CP TLQM',
      code: 'talung',
    }
  });

  console.log('✅ Tenants created!');

  console.log('👤 3. Seeding default Users...');
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  // TLQM Users (Tenant 12)
  await prisma.user.create({
    data: {
      id: 6,
      tenantId: 12,
      email: 'it@talunglogistics.com',
      password: passwordHash,
      fullName: 'BOS Admin',
      userType: 'SUPER_ADMIN',
    }
  });

  console.log('✅ Users created!');
  console.log('🎉 Database initialization complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
