import { Router } from 'express';
import { retryJob } from '../controllers/retry.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);
router.post('/:id', retryJob);

export default router;
