import { Router } from 'express';
import { getScheduledJobs, createScheduledJob, deleteScheduledJob } from '../controllers/scheduled-jobs.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);
router.get('/', getScheduledJobs);
router.post('/', createScheduledJob);
router.delete('/:id', deleteScheduledJob);

export default router;
