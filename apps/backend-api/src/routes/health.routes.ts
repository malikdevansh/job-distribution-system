import { Router } from 'express';
import { getHealth } from '../controllers/health.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);
router.get('/', getHealth);

export default router;
