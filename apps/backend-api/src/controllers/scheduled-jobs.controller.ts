import { Request, Response } from 'express';
import { prisma } from '@jobqueue/database';

export const getScheduledJobs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;

    let queueIds: string[] | undefined;

    if (userRole !== 'ADMIN') {
      const orgs = await prisma.organization.findMany({ where: { ownerId: userId } });
      const orgIds = orgs.map((o) => o.id);
      const projects = await prisma.project.findMany({ where: { orgId: { in: orgIds } } });
      const projectIds = projects.map((p) => p.id);
      const queues = await prisma.queue.findMany({ where: { projectId: { in: projectIds } } });
      queueIds = queues.map((q) => q.id);
    }

    const where = queueIds ? { queueId: { in: queueIds } } : {};

    const scheduledJobs = await prisma.scheduledJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        queue: { select: { name: true, projectId: true } },
      },
    });

    res.json(scheduledJobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createScheduledJob = async (req: Request, res: Response) => {
  try {
    const { queueId, cron, payload } = req.body;
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;

    if (!queueId || !cron) {
      return res.status(400).json({ error: 'queueId and cron are required' });
    }

    if (typeof cron !== 'string' || cron.trim().split(/\s+/).length < 5) {
      return res.status(400).json({ error: 'Invalid cron expression (must have 5 fields)' });
    }

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: { project: { include: { organization: true } } },
    });
    if (!queue) return res.status(404).json({ error: 'Queue not found' });
    if (userRole !== 'ADMIN' && queue.project.organization.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const scheduledJob = await prisma.scheduledJob.create({
      data: {
        queueId,
        cron,
        payload: payload || {},
        nextRunAt: new Date(),
      },
      include: {
        queue: { select: { name: true, projectId: true } },
      },
    });

    const wsServer = (req as any).wsServer;
    if (wsServer) {
      wsServer.broadcastToProject(queue.project.id, 'scheduler:updated', { scheduledJobId: scheduledJob.id, action: 'created' });
    }

    res.status(201).json(scheduledJob);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteScheduledJob = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id as string;
    const userRole = (req as any).user?.role as string;

    const scheduledJob = await prisma.scheduledJob.findUnique({
      where: { id },
      include: {
        queue: {
          include: { project: { include: { organization: true } } },
        },
      },
    });

    if (!scheduledJob) return res.status(404).json({ error: 'ScheduledJob not found' });
    if (userRole !== 'ADMIN' && scheduledJob.queue.project.organization.ownerId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const projectId = scheduledJob.queue.project.id;
    await prisma.scheduledJob.delete({ where: { id } });

    const wsServer = (req as any).wsServer;
    if (wsServer) {
      wsServer.broadcastToProject(projectId, 'scheduler:updated', { scheduledJobId: id, action: 'deleted' });
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
