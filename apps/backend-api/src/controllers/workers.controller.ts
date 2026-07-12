import { Request, Response } from 'express';
import { prisma } from '@jobqueue/database';
import { claimJobs } from '../services/dispatcher.service';

export const registerWorker = async (req: Request, res: Response) => {
  try {
    const { projectId, hostname, labels, capabilities } = req.body;
    const worker = await prisma.worker.create({
      data: { projectId, hostname, labels, capabilities, status: 'IDLE' },
    });
    res.status(201).json(worker);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const claimWorkerJobs = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { queueIds, limit } = req.body; // array of queueIds to pull from
    
    // Update heartbeat
    await prisma.worker.update({
      where: { id: id as string },
      data: { lastHeartbeatAt: new Date(), status: 'BUSY' },
    });

    const jobs = await claimJobs(id as string, queueIds, limit || 1);
    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getWorkers = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const where = projectId ? { projectId: String(projectId) } : {};
    const workers = await prisma.worker.findMany({ where });
    res.json(workers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
