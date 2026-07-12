import { Request, Response } from 'express';
import { prisma } from '@jobqueue/database';

interface Bucket {
  time: string;
  tsMs: number;
  processed: number;
  failed: number;
  retried: number;
  totalLatencyMs: number;
  countForLatency: number;
}

const BUCKET_MS = 60 * 1000;
const WINDOW_COUNT = 60;
const buckets: Bucket[] = [];

function getBucketKey(tsMs: number): number {
  return Math.floor(tsMs / BUCKET_MS) * BUCKET_MS;
}

function ensureBuckets(): void {
  const now = Date.now();
  const windowStart = getBucketKey(now) - (WINDOW_COUNT - 1) * BUCKET_MS;

  // Drop expired buckets
  while (buckets.length > 0 && (buckets[0]?.tsMs ?? 0) < windowStart) {
    buckets.shift();
  }

  // Ensure current bucket exists
  const currentKey = getBucketKey(now);
  const last = buckets[buckets.length - 1];
  if (!last || last.tsMs !== currentKey) {
    const d = new Date(currentKey);
    buckets.push({
      time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
      tsMs: currentKey,
      processed: 0,
      failed: 0,
      retried: 0,
      totalLatencyMs: 0,
      countForLatency: 0,
    });
  }
}

export async function refreshMetricsBucket(): Promise<void> {
  ensureBuckets();
  const current = buckets[buckets.length - 1];
  if (!current) return;

  const bucketStart = new Date(current.tsMs);
  const bucketEnd = new Date(current.tsMs + BUCKET_MS);

  try {
    const [completed, failed, retried] = await Promise.all([
      prisma.job.count({ where: { completedAt: { gte: bucketStart, lt: bucketEnd }, status: 'COMPLETED' } }),
      prisma.job.count({ where: { completedAt: { gte: bucketStart, lt: bucketEnd }, status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
      prisma.job.count({ where: { completedAt: { gte: bucketStart, lt: bucketEnd }, attemptCount: { gt: 1 } } }),
    ]);

    const latencyResult = await prisma.$queryRaw<{ avg: number | null }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt")) * 1000) as avg
      FROM "Job"
      WHERE status = 'COMPLETED'
        AND "completedAt" >= ${bucketStart}
        AND "completedAt" < ${bucketEnd}
        AND "completedAt" IS NOT NULL
    `;

    current.processed = completed;
    current.failed = failed;
    current.retried = retried;
    current.totalLatencyMs = latencyResult[0]?.avg != null ? Math.round(latencyResult[0].avg) : 0;
    current.countForLatency = completed;
  } catch (err) {
    console.error('[Metrics] Failed to refresh bucket:', err);
  }
}

export const getMetrics = async (_req: Request, res: Response) => {
  try {
    ensureBuckets();
    const series = buckets.map((b) => ({
      time: b.time,
      processed: b.processed,
      failed: b.failed,
      retried: b.retried,
      latency: b.countForLatency > 0 ? Math.round(b.totalLatencyMs) : 0,
    }));
    res.json(series);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMetricsSummary = async (_req: Request, res: Response) => {
  try {
    const [
      running, queued, scheduled, completed, failed,
      retryPending, deadLetter, activeWorkers,
      queueDepthRows, avgExecResult, avgWaitResult, throughputResult, totalWorkers,
    ] = await Promise.all([
      prisma.job.count({ where: { status: 'RUNNING' } }),
      prisma.job.count({ where: { status: 'QUEUED' } }),
      prisma.job.count({ where: { status: 'SCHEDULED' } }),
      prisma.job.count({ where: { status: 'COMPLETED' } }),
      prisma.job.count({ where: { status: 'FAILED' } }),
      prisma.job.count({ where: { status: 'RETRY_PENDING' } }),
      prisma.job.count({ where: { status: 'DEAD_LETTER' } }),
      prisma.worker.count({
        where: {
          status: { notIn: ['OFFLINE', 'STOPPED'] },
          lastHeartbeatAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
      }),
      prisma.$queryRaw<{ queueId: string; depth: bigint }[]>`
        SELECT "queueId", COUNT(*) as depth
        FROM "Job"
        WHERE status IN ('QUEUED', 'RUNNING', 'RETRY_PENDING')
        GROUP BY "queueId"
        ORDER BY depth DESC
        LIMIT 10
      `,
      prisma.$queryRaw<{ avg: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) * 1000) as avg
        FROM "Job"
        WHERE status = 'COMPLETED'
          AND "startedAt" IS NOT NULL
          AND "completedAt" IS NOT NULL
          AND "completedAt" >= NOW() - INTERVAL '24 hours'
      `,
      prisma.$queryRaw<{ avg: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM ("startedAt" - "createdAt")) * 1000) as avg
        FROM "Job"
        WHERE "startedAt" IS NOT NULL
          AND "startedAt" >= NOW() - INTERVAL '24 hours'
      `,
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM "Job"
        WHERE status IN ('COMPLETED', 'FAILED')
          AND "completedAt" >= NOW() - INTERVAL '5 minutes'
      `,
      prisma.worker.count(),
    ]);

    const workerUtilization = totalWorkers > 0 ? Math.round((activeWorkers / totalWorkers) * 100) : 0;
    const avgExecMs = avgExecResult[0]?.avg != null ? Math.round(avgExecResult[0].avg) : 0;
    const avgWaitMs = avgWaitResult[0]?.avg != null ? Math.round(avgWaitResult[0].avg) : 0;
    const rawCount = throughputResult[0]?.count;
    const jpm = rawCount != null ? Number(rawCount) / 5 : 0;

    res.json({
      running, queued, scheduled, completed, failed,
      retryPending, deadLetter, activeWorkers, totalWorkers,
      workerUtilization,
      avgExecMs, avgWaitMs,
      jobsPerMinute: Math.round(jpm * 10) / 10,
      queueDepth: queueDepthRows.map((r) => ({ queueId: r.queueId, depth: Number(r.depth) })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
