import { Request, Response } from 'express';
import { prisma } from '@jobqueue/database';

export const retryJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({ where: { id: id as string } });
    if (!job) {
       res.status(404).json({ error: 'Job not found' });
       return;
    }
    if (job.status !== 'FAILED' && job.status !== 'DEAD_LETTER') {
       res.status(400).json({ error: 'Only FAILED or DEAD_LETTER jobs can be retried' });
       return;
    }
    
    const updatedJob = await prisma.job.update({
      where: { id: id as string },
      data: {
        status: 'QUEUED',
        attemptCount: job.attemptCount + 1,
        errorPayload: require('@prisma/client').Prisma.DbNull,
        scheduledAt: new Date(), // run immediately
      }
    });
    res.json(updatedJob);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
