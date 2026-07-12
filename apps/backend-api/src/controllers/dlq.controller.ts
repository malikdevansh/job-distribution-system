import { Request, Response } from 'express';
import { prisma } from '@jobqueue/database';

export const getDeadLetterJobs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;
    const { queueId } = req.query;

    let allowedQueueIds: string[] | undefined;

    if (userRole !== 'ADMIN') {
      const orgs = await prisma.organization.findMany({ where: { ownerId: userId } });
      const orgIds = orgs.map((o) => o.id);
      const projects = await prisma.project.findMany({ where: { orgId: { in: orgIds } } });
      const projectIds = projects.map((p) => p.id);
      const queues = await prisma.queue.findMany({ where: { projectId: { in: projectIds } } });
      allowedQueueIds = queues.map((q) => q.id);
    }

    const where: any = { status: { in: ['DEAD_LETTER', 'FAILED'] } };
    if (queueId) where.queueId = String(queueId);
    if (allowedQueueIds) where.queueId = { in: allowedQueueIds };

    const jobs = await prisma.job.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      take: 200,
      include: { queue: { select: { name: true } } },
    });

    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const requeueJob = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        queue: {
          include: {
            project: {
              include: { organization: true },
            },
          },
        },
      },
    });

    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (userRole !== 'ADMIN' && job.queue.project.organization.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (job.status !== 'DEAD_LETTER' && job.status !== 'FAILED') {
      return res.status(400).json({ error: 'Only DEAD_LETTER or FAILED jobs can be requeued' });
    }

    const updated = await prisma.job.update({
      where: { id },
      data: {
        status: 'QUEUED',
        attemptCount: 0,
        errorPayload: null as any,
        workerId: null,
        startedAt: null,
        completedAt: null,
        scheduledAt: new Date(),
      },
    });

    const wsServer = (req as any).wsServer;
    if (wsServer) {
      wsServer.broadcastToProject(job.queue.project.id, 'job:updated', { jobId: id, status: 'QUEUED' });
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const requeueAll = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;

    let allowedQueueIds: string[] | undefined;

    if (userRole !== 'ADMIN') {
      const orgs = await prisma.organization.findMany({ where: { ownerId: userId } });
      const orgIds = orgs.map((o) => o.id);
      const projects = await prisma.project.findMany({ where: { orgId: { in: orgIds } } });
      const projectIds = projects.map((p) => p.id);
      const queues = await prisma.queue.findMany({ where: { projectId: { in: projectIds } } });
      allowedQueueIds = queues.map((q) => q.id);
    }

    const where: any = { status: { in: ['DEAD_LETTER', 'FAILED'] } };
    if (allowedQueueIds) where.queueId = { in: allowedQueueIds };

    const result = await prisma.job.updateMany({
      where,
      data: {
        status: 'QUEUED',
        attemptCount: 0,
        workerId: null,
        startedAt: null,
        completedAt: null,
        scheduledAt: new Date(),
      },
    });

    const wsServer = (req as any).wsServer;
    if (wsServer) wsServer.broadcast('dashboard:updated', { action: 'requeue-all' });

    res.json({ requeued: result.count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
