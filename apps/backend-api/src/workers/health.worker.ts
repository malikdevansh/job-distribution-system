import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function startHealthWorker() {
  console.log("Health Worker daemon started...");
  setInterval(async () => {
    try {
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      
      // Find crashed workers
      const crashedWorkers = await prisma.worker.findMany({
        where: {
          lastHeartbeatAt: { lt: thirtySecondsAgo },
          status: 'BUSY'
        }
      });
      
      if (crashedWorkers.length === 0) return;

      const workerIds = crashedWorkers.map((w: any) => w.id);
      
      // Mark them offline
      await prisma.worker.updateMany({
        where: { id: { in: workerIds } },
        data: { status: 'OFFLINE' }
      });

      // Re-queue their active jobs
      const result = await prisma.job.updateMany({
        where: {
          workerId: { in: workerIds },
          status: { in: ['CLAIMED', 'RUNNING'] }
        },
        data: {
          status: 'QUEUED',
          workerId: null,
          attemptCount: { increment: 1 }
        }
      });
      
      console.log(`Recovered ${result.count} jobs from ${workerIds.length} crashed workers.`);
    } catch (err) {
      console.error("Error in health worker daemon:", err);
    }
  }, 10000);
}
