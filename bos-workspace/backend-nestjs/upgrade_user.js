const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = 'postgresql://postgres:postgres@localhost:5435/bos_core_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Vui lòng cung cấp email của tài khoản muốn nâng cấp.');
    console.log('Ví dụ: node upgrade_user.js admin@bos.com');
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email }
  });

  if (!user) {
    console.error(`Không tìm thấy người dùng có email: ${email}`);
    process.exit(1);
  }

  const updatedUser = await prisma.user.update({
    where: {
      tenantId_id: {
        tenantId: user.tenantId,
        id: user.id
      }
    },
    data: {
      userType: 'SUPER_ADMIN'
    }
  });

  console.log(`Nâng cấp thành công!`);
  console.log(`Tài khoản: ${updatedUser.email}`);
  console.log(`Họ tên: ${updatedUser.fullName}`);
  console.log(`Vai trò (mới): ${updatedUser.userType}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
