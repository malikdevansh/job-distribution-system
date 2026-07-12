import { Request, Response } from 'express';
import { prisma } from '@jobqueue/database';

export const createOrganization = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = (req as any).user?.id;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const organization = await prisma.organization.create({
      data: { name, ownerId: userId },
    });
    res.status(201).json(organization);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrganizations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const organizations = await prisma.organization.findMany({
      where: userRole === 'ADMIN' ? {} : { ownerId: userId },
      include: {
        _count: {
          select: { projects: true }
        }
      }
    });
    
    // Map data for frontend
    const mapped = organizations.map(org => ({
      ...org,
      slug: org.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      members: 1, // Mock metric until member table exists, but structural fields are real
      plan: 'FREE',
      status: 'ACTIVE'
    }));

    res.json(mapped);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteOrganization = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (org.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.organization.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrganizationById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    
    const organization = await prisma.organization.findUnique({ where: { id } });
    if (!organization) {
       return res.status(404).json({ error: 'Organization not found' });
    }
    
    if (organization.ownerId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    res.json(organization);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
