const { PrismaClient } = require('@jobqueue/database');
const prisma = new PrismaClient();
async function main() {
  const jobs = await prisma.job.findMany();
  console.log('Jobs:', jobs.map(j => ({ id: j.id, status: j.status, queueId: j.queueId, workerId: j.workerId })));
}
main();
