import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function claimJobs(workerId: string, queueIds: string[], limit: number) {
  if (limit <= 0 || queueIds.length === 0) return [];

  const claimedJobs = await prisma.$queryRaw`
    UPDATE "Job"
    SET status = 'CLAIMED', "workerId" = ${workerId}, "startedAt" = NOW()
    WHERE id IN (
      SELECT id FROM "Job"
      WHERE "queueId" = ANY(${queueIds}) 
        AND status IN ('QUEUED', 'RETRY_PENDING')
        AND "scheduledAt" <= NOW()
      ORDER BY priority DESC, "createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
  `;
  return claimedJobs;
}

export async function renewLease(jobId: string, workerId: string, extensionMs: number = 30000) {
  // A job's lease is implicitly tied to the worker's heartbeat, 
  // but for long running jobs we update the timeout explicitly
  await prisma.job.updateMany({
    where: {
      id: jobId,
      workerId: workerId,
      status: 'RUNNING'
    },
    data: {
      timeoutMs: { increment: extensionMs }
    }
  });
}
