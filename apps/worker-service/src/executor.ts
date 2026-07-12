import { PrismaClient } from '@prisma/client';
import { calculateNextRetry, RetryPolicy, RetryStrategy } from '@jobqueue/shared-utils';

const prisma = new PrismaClient();

export async function failJob(jobId: string, error: Error, retryPolicy: RetryPolicy) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  const newAttemptCount = job.attemptCount + 1;

  if (newAttemptCount >= retryPolicy.maxAttempts) {
    // Move to DLQ
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'DEAD_LETTER',
        errorPayload: { message: error.message, stack: error.stack },
        workerId: null,
        completedAt: new Date(),
      }
    });
  } else {
    // Schedule Retry
    const nextRun = calculateNextRetry(retryPolicy, newAttemptCount);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'RETRY_PENDING',
        attemptCount: newAttemptCount,
        scheduledAt: nextRun,
        errorPayload: { message: error.message },
        workerId: null
      }
    });
  }
}

export async function completeJob(jobId: string, result: any) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      outputPayload: result,
      completedAt: new Date(),
      workerId: null
    }
  });
}
