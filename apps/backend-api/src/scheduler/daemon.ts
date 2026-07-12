import { prisma } from '@jobqueue/database';

export async function startSchedulerDaemon() {
  console.log("Scheduler Daemon started...");
  setInterval(async () => {
    try {
      // Find jobs that are SCHEDULED and ready to run
      const result = await prisma.$executeRaw`
        UPDATE "Job"
        SET status = 'QUEUED'
        WHERE status = 'SCHEDULED' 
          AND "scheduledAt" <= NOW()
      `;
      if (result > 0) {
        console.log(`Promoted ${result} scheduled jobs to QUEUED`);
      }
    } catch (err) {
      console.error("Error in scheduler daemon:", err);
    }
  }, 1000);
}
