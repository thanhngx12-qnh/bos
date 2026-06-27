const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = 'postgresql://postgres:postgres@localhost:5435/bos_core_db?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== SEARCHING FOR INITIAL VALUES ===');
  const fields = await prisma.fieldRegistry.findMany();
  let found = 0;
  fields.forEach(f => {
    const config = f.config || {};
    const options = config.options || {};
    const initVal = options.initValue !== undefined ? options.initValue : options.defaultValue;
    const directInitVal = config.initValue !== undefined ? config.initValue : config.defaultValue;
    
    if (initVal !== undefined || directInitVal !== undefined) {
      console.log(`Field #${f.id} (${f.code}) in Entity ${config.entityId || f.entityId}`);
      console.log(`- options.initValue/defaultValue:`, initVal);
      console.log(`- config.initValue/defaultValue:`, directInitVal);
      console.log(`- Full config:`, JSON.stringify(config, null, 2));
      console.log('----------------------------------------------------');
      found++;
    }
  });
  console.log(`Found ${found} fields with default/initial values.`);
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
