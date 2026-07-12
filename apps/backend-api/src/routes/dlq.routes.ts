import { Router } from 'express';
import { getDeadLetterJobs, requeueJob, requeueAll } from '../controllers/dlq.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);
router.get('/', getDeadLetterJobs);
router.post('/requeue-all', requeueAll);
router.post('/:id/requeue', requeueJob);

export default router;
