import { Router } from 'express';
import { createProject, getProjects, generateApiKey, getApiKeys, deleteProject } from '../controllers/projects.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticateJWT } from '../middleware/auth.middleware';
import { createProjectSchema } from '../validators';

const router = Router();

router.use(authenticateJWT);
router.post('/', validateRequest(createProjectSchema), createProject);
router.get('/', getProjects);
router.delete('/:id', deleteProject);
router.get('/:id/api-keys', getApiKeys);
router.post('/:id/api-keys', generateApiKey);

export default router;
