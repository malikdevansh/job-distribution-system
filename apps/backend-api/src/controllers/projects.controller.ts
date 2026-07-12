import { Request, Response } from 'express';
import { prisma } from '@jobqueue/database';
import crypto from 'crypto';

export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, orgId } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    
    if (!name || !orgId) {
      return res.status(400).json({ error: 'Name and orgId are required' });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org || (org.ownerId !== userId && userRole !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const project = await prisma.project.create({
      data: { name, orgId },
    });
    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const projects = await prisma.project.findMany({
      where: userRole === 'ADMIN' ? {} : {
        organization: { ownerId: userId }
      },
      include: {
        _count: {
          select: { queues: true } // Removed jobs as it's not a direct relation
        }
      }
    });

    const mapped = projects.map(p => ({
      ...p,
      status: 'ACTIVE',
      jobs: 0, // Mock metric until jobs are connected
      queues: p._count.queues
    }));

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: { organization: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.organization.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.project.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getApiKeys = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: { organization: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.organization.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!project.apiKeyHash) {
      return res.json({ keys: [] });
    }

    res.json({ keys: [{ id: 'key-1', key: 'sk_live_... (hidden)', createdAt: project.createdAt }] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const generateApiKey = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: { organization: true }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.organization.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const rawKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');

    await prisma.project.update({
      where: { id },
      data: { apiKeyHash: hash },
    });

    res.json({ key: rawKey });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
