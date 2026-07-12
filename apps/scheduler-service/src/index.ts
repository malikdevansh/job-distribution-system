import { prisma } from '@jobqueue/database';
import { JobStatus, WorkerStatus } from '@jobqueue/shared-types';
const cronParser = require('cron-parser');

const POLL_INTERVAL = 5000;
const LEASE_RECOVERY_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

async function processScheduledJobs() {
    try {
        const now = new Date();
        
        // Find jobs that are SCHEDULED and ready to run
        const readyJobs = await prisma.job.findMany({
            where: {
                status: JobStatus.SCHEDULED,
                scheduledAt: {
                    lte: now
                }
            }
        });

        if (readyJobs.length === 0) return;

        console.log(`[Scheduler] Found ${readyJobs.length} scheduled jobs to process`);

        for (const job of readyJobs) {
            await prisma.$transaction(async (tx: any) => {
                const payload = job.payload as any;
                const isCron = payload && typeof payload.cron === 'string';

                // Mark current job as QUEUED
                await tx.job.update({
                    where: { id: job.id },
                    data: { status: JobStatus.QUEUED }
                });

                // If it's a cron job, spawn the next instance
                if (isCron) {
                    try {
                        const interval = cronParser.parseExpression(payload.cron, { currentDate: now });
                        const nextDate = interval.next().toDate();

                        await tx.job.create({
                            data: {
                                queueId: job.queueId,
                                status: JobStatus.SCHEDULED,
                                payload: job.payload ?? {},
                                priority: job.priority,
                                scheduledAt: nextDate,
                                timeoutMs: job.timeoutMs,
                            }
                        });
                        console.log(`[Scheduler] Spawned next instance for cron job (original ID: ${job.id}), next run: ${nextDate.toISOString()}`);
                    } catch (cronError) {
                        console.error(`[Scheduler] Failed to parse cron expression for job ${job.id}:`, cronError);
                        // If cron is invalid, we don't spawn next instance. The current one will just execute once.
                    }
                }
            });
        }
    } catch (error) {
        console.error('[Scheduler] Error processing scheduled jobs:', error);
    }
}

async function recoverLeases() {
    try {
        const now = new Date();
        const cutoffTime = new Date(now.getTime() - HEARTBEAT_TIMEOUT_MS);

        // Find RUNNING jobs where worker's lastHeartbeat is older than cutoff
        // or where there is no worker (orphaned)
        const deadJobs = await prisma.job.findMany({
            where: {
                status: JobStatus.RUNNING,
                OR: [
                    { workerId: null },
                    {
                        worker: {
                            lastHeartbeatAt: {
                                lt: cutoffTime
                            }
                        }
                    }
                ]
            }
        });

        if (deadJobs.length === 0) return;

        console.log(`[Scheduler] Found ${deadJobs.length} dead jobs for lease recovery`);

        for (const job of deadJobs) {
            const maxAttempts = 3; 
            const hasMoreAttempts = job.attemptCount < maxAttempts;
            
            const nextStatus = hasMoreAttempts ? JobStatus.QUEUED : JobStatus.FAILED;

            await prisma.job.update({
                where: { id: job.id },
                data: {
                    status: nextStatus,
                    workerId: null, // Clear the worker assignment
                    startedAt: null, // Reset start time so it can be picked up again properly if QUEUED
                    errorPayload: (nextStatus === JobStatus.FAILED 
                        ? { error: 'Worker lease expired / worker died' }
                        : (job.errorPayload ?? {})) as any
                }
            });

            console.log(`[Scheduler] Recovered job ${job.id} -> ${nextStatus}`);
        }
    } catch (error) {
        console.error('[Scheduler] Error recovering leases:', error);
    }
}

async function main() {
    console.log('[Scheduler] Starting scheduler service...');

    // Run loops
    setInterval(() => {
        processScheduledJobs().catch(console.error);
    }, POLL_INTERVAL);

    setInterval(() => {
        recoverLeases().catch(console.error);
    }, LEASE_RECOVERY_INTERVAL);

    // Initial run
    await processScheduledJobs();
    await recoverLeases();
    
    console.log('[Scheduler] Service is running.');
}

// Handle shutdown
process.on('SIGINT', async () => {
    console.log('\n[Scheduler] Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n[Scheduler] Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

main().catch((err) => {
    console.error('[Scheduler] Fatal error:', err);
    process.exit(1);
});
