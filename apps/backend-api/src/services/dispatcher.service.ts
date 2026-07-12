import { prisma } from '@jobqueue/database';

export async function claimJobs(workerId: string, queueIds: string[], limit: number) {
  if (limit <= 0) return [];
  if (queueIds.length === 0) return [];

  // Atomic claim using SKIP LOCKED in PostgreSQL
  const claimedJobs = await prisma.$queryRaw`
    UPDATE "Job"
    SET status = 'CLAIMED', "workerId" = ${workerId}, "startedAt" = NOW()
    WHERE id IN (
      SELECT id FROM "Job"
      WHERE "queueId" = ANY(${queueIds}) 
        AND status = 'QUEUED' 
        AND "scheduledAt" <= NOW()
      ORDER BY priority DESC, "createdAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
  `;
  return claimedJobs;
}
