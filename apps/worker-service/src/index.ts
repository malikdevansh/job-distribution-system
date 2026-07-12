import { PrismaClient, Job, Queue } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import Redis from 'ioredis';
import { claimJobs, renewLease } from './dispatcher';
import { failJob, completeJob } from './executor';
import { RetryPolicy, RetryStrategy } from '@jobqueue/shared-utils';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const PROJECT_ID = process.env.PROJECT_ID;
const WORKER_ID = process.env.WORKER_ID || uuidv4();
const HOSTNAME = os.hostname();
const HEARTBEAT_INTERVAL_MS = 15000;
const POLL_INTERVAL_MS = 2000;
const LEASE_RENEWAL_INTERVAL_MS = 30000;

let isShuttingDown = false;
let activeJobs = new Map<string, Promise<void>>();

// Dummy default retry policy
const defaultRetryPolicy: RetryPolicy = {
  strategy: RetryStrategy.EXPONENTIAL,
  maxAttempts: 3,
  baseDelayMs: 1000,
  jitterEnabled: true,
  maxDelayMs: 60000
};

async function checkRateLimit(queueId: string, limitPerMinute: number | null): Promise<boolean> {
  if (!limitPerMinute || limitPerMinute <= 0) return true;
  
  const key = `ratelimit:${queueId}`;
  const now = Date.now();
  const windowStart = now - 60000;
  
  // Clean up old entries
  await redis.zremrangebyscore(key, '-inf', windowStart);
  
  // Count current requests
  const count = await redis.zcard(key);
  
  if (count >= limitPerMinute) {
    return false;
  }
  
  // Add current request with a unique value to avoid set collision
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, 60);
  
  return true;
}

async function registerWorker() {
  console.log(`[Worker ${WORKER_ID}] Registering...`);
  
  await prisma.worker.upsert({
    where: { id: WORKER_ID },
    update: {
      status: 'ONLINE',
      lastHeartbeatAt: new Date(),
    },
    create: {
      id: WORKER_ID,
      projectId: PROJECT_ID!,
      hostname: HOSTNAME,
      status: 'ONLINE',
      labels: {},
      capabilities: {},
    }
  });

  console.log(`[Worker ${WORKER_ID}] Registered successfully.`);
}

async function heartbeat() {
  if (isShuttingDown) return;

  try {
    await prisma.worker.update({
      where: { id: WORKER_ID },
      data: {
        lastHeartbeatAt: new Date(),
        status: isShuttingDown ? 'DRAINING' : 'ONLINE'
      }
    });
  } catch (error) {
    console.error(`[Worker ${WORKER_ID}] Failed to send heartbeat:`, error);
  }

  setTimeout(heartbeat, HEARTBEAT_INTERVAL_MS);
}

async function executeJobHandler(job: Job, queue: Queue) {
  let leaseInterval: NodeJS.Timeout | null = null;
  
  try {
    // 1. Update job to RUNNING
    await prisma.job.update({
      where: { id: job.id },
      data: { status: 'RUNNING' }
    });

    // 2. Start lease renewal loop
    leaseInterval = setInterval(async () => {
      try {
        await renewLease(job.id, WORKER_ID, LEASE_RENEWAL_INTERVAL_MS);
      } catch (e) {
        console.error(`[Worker ${WORKER_ID}] Failed to renew lease for job ${job.id}`, e);
      }
    }, Math.floor(LEASE_RENEWAL_INTERVAL_MS / 2));

    // 3. Simulate job execution
    console.log(`[Worker ${WORKER_ID}] Executing job ${job.id} (Queue: ${queue.name})...`);
    
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;
    const duration = payload?.duration || 2000;
    const shouldFail = payload?.shouldFail || false;
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    if (shouldFail) {
      throw new Error(payload?.errorMessage || 'Simulated job failure');
    }

    const output = { success: true, processedAt: new Date(), message: 'Job finished successfully.' };
    
    // 4. Mark job as complete
    await completeJob(job.id, output);
    console.log(`[Worker ${WORKER_ID}] Completed job ${job.id}`);
  } catch (error: any) {
    console.error(`[Worker ${WORKER_ID}] Job ${job.id} failed:`, error.message);
    await failJob(job.id, error, defaultRetryPolicy);
  } finally {
    if (leaseInterval) {
      clearInterval(leaseInterval);
    }
    activeJobs.delete(job.id);
  }
}

async function recoverJobs() {
  console.log(`[Worker ${WORKER_ID}] Attempting crash recovery for stale jobs...`);
  // Find jobs assigned to this worker that are stuck in CLAIMED or RUNNING
  const stuckJobs = await prisma.job.findMany({
    where: {
      workerId: WORKER_ID,
      status: { in: ['CLAIMED', 'RUNNING'] }
    },
    include: { queue: true }
  });

  if (stuckJobs.length > 0) {
    console.log(`[Worker ${WORKER_ID}] Found ${stuckJobs.length} stuck jobs from previous run. Re-queuing them.`);
    // Push them back to QUEUED so they can be picked up safely
    await prisma.$transaction(
      stuckJobs.map((job: any) => prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'QUEUED',
          workerId: null,
          startedAt: null
        }
      }))
    );
  }
}

async function poll() {
  if (isShuttingDown) return;

  try {
    const queues = await prisma.queue.findMany({
      where: { projectId: PROJECT_ID!, status: 'ACTIVE' }
    });

    if (queues.length === 0) {
      setTimeout(poll, POLL_INTERVAL_MS);
      return;
    }

    // 2. We want to process fairly or by priority. For now, fetch jobs across queues.
    // Group queues to avoid exceeding maxConcurrency. 
    // We could count active jobs per queue in THIS worker, or overall?
    // MaxConcurrency usually means worker bounds per queue (e.g. at most 10 of queue X).
    
    // Calculate how many jobs of each queue we can still take
    const queueMap = new Map<string, Queue>();
    for (const q of queues) queueMap.set(q.id, q);
    
    // Determine how many jobs from each queue are currently running in THIS worker
    const activeJobCountsByQueue = new Map<string, number>();
    for (const q of queues) activeJobCountsByQueue.set(q.id, 0);
    
    // We don't have queueId directly in activeJobs map, let's just query from DB for safety
    // Or we could track it locally. Let's track locally to be fast.
    const activeJobDocs = await prisma.job.findMany({
      where: { id: { in: Array.from(activeJobs.keys()) } },
      select: { queueId: true }
    });
    
    for (const job of activeJobDocs) {
      activeJobCountsByQueue.set(job.queueId, (activeJobCountsByQueue.get(job.queueId) || 0) + 1);
    }
    
    const availableQueueIds: string[] = [];
    let maxJobsToClaim = 0;
    
    for (const q of queues) {
      const activeCount = activeJobCountsByQueue.get(q.id) || 0;
      const availableCapacity = q.maxConcurrency - activeCount;
      if (availableCapacity > 0) {
        availableQueueIds.push(q.id);
        maxJobsToClaim += availableCapacity;
      }
    }
    
    // Limit total claim to some sane batch size to avoid long lock times
    const claimLimit = Math.min(10, maxJobsToClaim);
    
    if (availableQueueIds.length > 0 && claimLimit > 0) {
      const claimedJobs = await claimJobs(WORKER_ID, availableQueueIds, claimLimit);
      
      for (const job of claimedJobs as Job[]) {
        const queue = queueMap.get(job.queueId)!;
        
        // Check rate limit for the queue
        const withinRateLimit = await checkRateLimit(queue.id, queue.rateLimit);
        
        if (!withinRateLimit) {
          console.log(`[Worker ${WORKER_ID}] Rate limit exceeded for queue ${queue.name}. Re-queuing job ${job.id}.`);
          // Revert claim and push back to queue
          await prisma.job.update({
            where: { id: job.id },
            data: { status: 'QUEUED', workerId: null, startedAt: null }
          });
          continue;
        }

        // Start execution
        const jobPromise = executeJobHandler(job, queue);
        activeJobs.set(job.id, jobPromise);
      }
    }

  } catch (error) {
    console.error(`[Worker ${WORKER_ID}] Polling error:`, error);
  }

  // Schedule next poll
  setTimeout(poll, POLL_INTERVAL_MS);
}

async function shutdown() {
  console.log(`[Worker ${WORKER_ID}] Graceful shutdown initiated...`);
  isShuttingDown = true;
  
  await prisma.worker.update({
    where: { id: WORKER_ID },
    data: { status: 'DRAINING' }
  });

  // Wait for active jobs to finish (max 30 seconds)
  if (activeJobs.size > 0) {
    console.log(`[Worker ${WORKER_ID}] Waiting for ${activeJobs.size} jobs to finish...`);
    const timeout = new Promise(resolve => setTimeout(resolve, 30000));
    await Promise.race([Promise.all(activeJobs.values()), timeout]);
  }

  await prisma.worker.update({
    where: { id: WORKER_ID },
    data: { status: 'STOPPED' }
  });
  
  await prisma.$disconnect();
  redis.disconnect();
  
  console.log(`[Worker ${WORKER_ID}] Shutdown complete.`);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function start() {
  try {
    await registerWorker();
    await recoverJobs();
    
    console.log(`[Worker ${WORKER_ID}] Starting polling loop...`);
    setTimeout(heartbeat, HEARTBEAT_INTERVAL_MS);
    setTimeout(poll, 0);
  } catch (error) {
    console.error(`[Worker ${WORKER_ID}] Startup failed:`, error);
    process.exit(1);
  }
}

start();
