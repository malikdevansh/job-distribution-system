import { Router } from 'express';
import { registerWorker, claimWorkerJobs, getWorkers } from '../controllers/workers.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticateJWT } from '../middleware/auth.middleware';
import { registerWorkerSchema } from '../validators';
import { z } from 'zod';

const router = Router();

router.use(authenticateJWT);
router.post('/register', validateRequest(registerWorkerSchema), registerWorker);
router.get('/', getWorkers);
router.post('/:id/claim', validateRequest(z.object({
  queueIds: z.array(z.string().uuid()),
  limit: z.number().int().positive().optional(),
})), claimWorkerJobs);

export default router;
