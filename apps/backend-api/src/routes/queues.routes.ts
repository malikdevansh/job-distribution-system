import { Router } from 'express';
import { createQueue, getQueues, updateQueue, deleteQueue } from '../controllers/queues.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticateJWT } from '../middleware/auth.middleware';
import { createQueueSchema, updateQueueSchema } from '../validators';

const router = Router();

router.use(authenticateJWT);
router.post('/', validateRequest(createQueueSchema), createQueue);
router.get('/', getQueues);
router.patch('/:id', validateRequest(updateQueueSchema), updateQueue);
router.delete('/:id', deleteQueue);

export default router;
