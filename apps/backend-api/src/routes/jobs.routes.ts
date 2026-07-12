import { Router } from 'express';
import { createJob, getJobs, getJob, updateJobStatus, deleteJob, retryJob, cancelJob, cloneJob } from '../controllers/jobs.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticateJWT } from '../middleware/auth.middleware';
import { createJobSchema, updateJobStatusSchema, cloneJobSchema, cancelJobSchema } from '../validators';

const router = Router();

router.use(authenticateJWT);
router.post('/', validateRequest(createJobSchema), createJob);
router.get('/', getJobs);
router.get('/:id', getJob);
router.delete('/:id', deleteJob);
router.patch('/:id/status', validateRequest(updateJobStatusSchema), updateJobStatus);
router.patch('/:id/retry', retryJob);
router.patch('/:id/cancel', validateRequest(cancelJobSchema), cancelJob);
router.post('/:id/clone', validateRequest(cloneJobSchema), cloneJob);

export default router;
