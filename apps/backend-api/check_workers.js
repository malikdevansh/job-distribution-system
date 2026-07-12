const { PrismaClient } = require('@jobqueue/database');
const prisma = new PrismaClient();
async function main() {
  const workers = await prisma.worker.findMany();
  console.log('Workers:', workers);
}
main();
