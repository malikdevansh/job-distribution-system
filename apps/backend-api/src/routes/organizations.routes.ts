import { Router } from 'express';
import { createOrganization, getOrganizations, getOrganizationById, deleteOrganization } from '../controllers/organizations.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticateJWT } from '../middleware/auth.middleware';
import { createOrgSchema } from '../validators';

const router = Router();

router.use(authenticateJWT);
router.post('/', validateRequest(createOrgSchema), createOrganization);
router.get('/', getOrganizations);
router.get('/:id', getOrganizationById);
router.delete('/:id', deleteOrganization);

export default router;
