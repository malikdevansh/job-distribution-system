import { Request, Response } from 'express';
import { prisma } from '@jobqueue/database';

export const createQueue = async (req: Request, res: Response) => {
  try {
    const { name, projectId, maxConcurrency, rateLimit } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!name || !projectId) {
      return res.status(400).json({ error: 'Name and projectId are required' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { organization: true }
    });

    if (!project || (project.organization.ownerId !== userId && userRole !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const queue = await prisma.queue.create({
      data: {
        name,
        projectId,
        maxConcurrency: maxConcurrency || 100,
        rateLimit
      },
    });
    res.status(201).json(queue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getQueues = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const queues = await prisma.queue.findMany({
      where: userRole === 'ADMIN' ? {} : {
        project: {
          organization: { ownerId: userId }
        }
      }
    });
    res.json(queues);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateQueue = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { maxConcurrency, rateLimit, status } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const queue = await prisma.queue.findUnique({
      where: { id },
      include: { project: { include: { organization: true } } }
    });

    if (!queue || (queue.project.organization.ownerId !== userId && userRole !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await prisma.queue.update({
      where: { id },
      data: {
        maxConcurrency: maxConcurrency !== undefined ? maxConcurrency : undefined,
        rateLimit: rateLimit !== undefined ? rateLimit : undefined,
        status: status !== undefined ? status : undefined
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteQueue = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const queue = await prisma.queue.findUnique({
      where: { id },
      include: { project: { include: { organization: true } } }
    });

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    if (queue.project.organization.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.queue.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
