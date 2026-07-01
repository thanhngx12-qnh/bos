import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = 'postgresql://postgres:postgres@localhost:5435/bos_core_db?schema=public';
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
      id: 1,
      name: 'Tập đoàn Đại Dương - Ocean Group',
      code: 'ocean',
    }
  });

  await prisma.tenant.create({
    data: {
      id: 2,
      name: 'Công ty Logistics Ánh Dương - Sun Logistics',
      code: 'sunlog',
    }
  });

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

  // Ocean Group Users (Tenant 1)
  await prisma.user.create({
    data: {
      id: 1,
      tenantId: 1,
      email: 'admin_ocean@ocean.com',
      password: passwordHash,
      fullName: 'QA Admin Ocean',
      userType: 'INTERNAL',
    }
  });

  await prisma.user.create({
    data: {
      id: 2,
      tenantId: 1,
      email: 'tgd_ocean@ocean.com',
      password: passwordHash,
      fullName: 'CEO',
      userType: 'INTERNAL',
    }
  });

  await prisma.user.create({
    data: {
      id: 3,
      tenantId: 1,
      email: 'muasam_tp@ocean.com',
      password: passwordHash,
      fullName: 'Trần Văn Trưởng (TP Mua sắm)',
      userType: 'INTERNAL',
    }
  });

  await prisma.user.create({
    data: {
      id: 4,
      tenantId: 1,
      email: 'muasam_nv@ocean.com',
      password: passwordHash,
      fullName: 'Lê Văn Nhân Viên (Mua sắm)',
      userType: 'INTERNAL',
    }
  });

  await prisma.user.create({
    data: {
      id: 5,
      tenantId: 1,
      email: 'ketoan_tp@ocean.com',
      password: passwordHash,
      fullName: 'Phạm Thị Kế Toán (Kế toán trưởng)',
      userType: 'INTERNAL',
    }
  });

  // Sun Logistics Users (Tenant 2)
  await prisma.user.create({
    data: {
      id: 10,
      tenantId: 2,
      email: 'admin_sun@sunlog.com',
      password: passwordHash,
      fullName: 'Sun Admin QA',
      userType: 'INTERNAL',
    }
  });

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

  await prisma.user.create({
    data: {
      id: 11,
      tenantId: 12,
      email: 'sales1@talunglogistics.com',
      password: passwordHash,
      fullName: 'Test Sales',
      userType: 'INTERNAL',
    }
  });

  console.log('✅ Users created!');
  console.log('🎉 Database initialization complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
