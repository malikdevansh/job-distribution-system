import { Request, Response } from 'express';
import { prisma } from '@jobqueue/database';

// Helper for RBAC check
async function getJobWithRBAC(jobId: string, userId: string, userRole: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      queue: {
        include: {
          project: {
            include: { organization: true }
          }
        }
      }
    }
  });

  if (!job) return null;
  if (userRole !== 'ADMIN' && job.queue.project.organization.ownerId !== userId) {
    throw new Error('FORBIDDEN');
  }
  return job;
}

export const createJob = async (req: Request, res: Response) => {
  try {
    const { queueId, payload, priority, scheduledAt, cron, timeoutMs } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // RBAC: Verify queue ownership
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: { project: { include: { organization: true } } }
    });

    if (!queue) return res.status(404).json({ error: 'Queue not found' });
    if (userRole !== 'ADMIN' && queue.project.organization.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (cron) {
      const scheduledJob = await prisma.scheduledJob.create({
        data: {
          queueId,
          cron,
          payload,
          nextRunAt: new Date(), 
        }
      });
      return res.status(201).json(scheduledJob);
    }

    const job: any = await prisma.job.create({
      data: {
        queueId,
        payload,
        priority: priority || 0,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        status: scheduledAt ? 'SCHEDULED' : 'QUEUED',
        timeoutMs: timeoutMs || 300000,
      },
      include: { queue: true }
    });
    
    const wsServer = (req as any).wsServer;
    if (wsServer) {
      wsServer.broadcastToProject(job.queue.projectId, 'job.created', job);
    }
    
    res.status(201).json(job);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getJobs = async (req: Request, res: Response) => {
  try {
    const { queueId, status, search, page = '1', limit = '20' } = req.query;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (userRole !== 'ADMIN') {
      where.queue = {
        project: {
          organization: {
            ownerId: userId
          }
        }
      };
    }

    if (queueId) where.queueId = String(queueId);
    if (status) where.status = String(status);
    if (search) {
      where.id = { startsWith: String(search) }; 
    }
    
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({ 
        where, 
        orderBy: { createdAt: 'desc' }, 
        skip, 
        take: limitNum 
      }),
      prisma.job.count({ where })
    ]);

    res.json({ jobs, total, page: pageNum, limit: limitNum });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getJob = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const id = req.params.id as string;

    const job = await getJobWithRBAC(id, userId, userRole);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    const [worker, logs] = await Promise.all([
      job.workerId ? prisma.worker.findUnique({ where: { id: job.workerId } }) : null,
      prisma.jobExecution.findMany({ where: { jobId: job.id }, orderBy: { startedAt: 'desc' } })
    ]);

    res.json({ ...job, workerDetails: worker, executions: logs });
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
    res.status(500).json({ error: error.message });
  }
};

export const updateJobStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, errorPayload, outputPayload } = req.body;
    
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const jobCheck = await getJobWithRBAC(id, userId, userRole);
    if (!jobCheck) return res.status(404).json({ error: 'Job not found' });

    const updateData: any = { status };
    if (errorPayload) updateData.errorPayload = errorPayload;
    if (outputPayload) updateData.outputPayload = outputPayload;
    if (status === 'COMPLETED' || status === 'FAILED' || status === 'DEAD_LETTER') {
      updateData.completedAt = new Date();
    }
    
    const job: any = await prisma.job.update({
      where: { id },
      data: updateData,
      include: { queue: true }
    });
    
    const wsServer = (req as any).wsServer;
    if (wsServer && job.queue) {
      wsServer.broadcastToProject(job.queue.projectId, 'job.updated', job);
    }
    res.json(job);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
    res.status(500).json({ error: error.message });
  }
};

export const retryJob = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const jobCheck = await getJobWithRBAC(id, userId, userRole);
    if (!jobCheck) return res.status(404).json({ error: 'Job not found' });

    const job: any = await prisma.job.update({
      where: { id },
      data: {
        status: 'QUEUED',
        attemptCount: 0,
        workerId: null,
        startedAt: null,
        completedAt: null,
        errorPayload: null as any,
        scheduledAt: new Date()
      },
      include: { queue: true }
    });

    const wsServer = (req as any).wsServer;
    if (wsServer && job.queue) {
      wsServer.broadcastToProject(job.queue.projectId, 'job.retry', job);
    }
    res.json(job);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
    res.status(500).json({ error: error.message });
  }
};

export const cancelJob = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const jobCheck = await getJobWithRBAC(id, userId, userRole);
    if (!jobCheck) return res.status(404).json({ error: 'Job not found' });

    const job: any = await prisma.job.update({
      where: { id },
      data: {
        status: 'FAILED', 
        errorPayload: { message: 'Cancelled by user' },
        completedAt: new Date()
      },
      include: { queue: true }
    });

    const wsServer = (req as any).wsServer;
    if (wsServer && job.queue) {
      wsServer.broadcastToProject(job.queue.projectId, 'job.cancelled', job);
    }
    res.json(job);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
    res.status(500).json({ error: error.message });
  }
};

export const cloneJob = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const { queueId, scheduledAt, priority } = req.body;

    const originalJob = await getJobWithRBAC(id, userId, userRole);
    if (!originalJob) return res.status(404).json({ error: 'Job not found' });

    const job: any = await prisma.job.create({
      data: {
        queueId: queueId || originalJob.queueId,
        payload: originalJob.payload as any,
        priority: priority !== undefined ? priority : originalJob.priority,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        status: scheduledAt ? 'SCHEDULED' : 'QUEUED',
        timeoutMs: originalJob.timeoutMs,
      },
      include: { queue: true }
    });

    const wsServer = (req as any).wsServer;
    if (wsServer && job.queue) {
      wsServer.broadcastToProject(job.queue.projectId, 'job.created', job);
    }
    res.status(201).json(job);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
    res.status(500).json({ error: error.message });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const jobCheck: any = await getJobWithRBAC(id, userId, userRole);
    if (!jobCheck) return res.status(404).json({ error: 'Job not found' });

    const projectId = jobCheck.queue?.project?.organization ? jobCheck.queue.projectId : null;
    await prisma.job.delete({ where: { id } });

    const wsServer = (req as any).wsServer;
    if (wsServer && projectId) {
      wsServer.broadcastToProject(projectId, 'job:updated', { jobId: id, status: 'DELETED' });
    }
    res.status(204).send();

  } catch (error: any) {
    if (error.message === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
    res.status(500).json({ error: error.message });
  }
};
