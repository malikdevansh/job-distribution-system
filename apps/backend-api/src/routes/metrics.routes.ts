import { Router } from 'express';
import { getMetrics, getMetricsSummary } from '../controllers/metrics.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJWT);
router.get('/', getMetrics);
router.get('/summary', getMetricsSummary);

export default router;
