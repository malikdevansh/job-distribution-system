import { Router } from 'express';
import { login, refresh, me, verifyEmail, resetPassword, register } from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { loginSchema, registerSchema } from '../validators';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/refresh', refresh);
router.post('/verify-email', verifyEmail);
router.post('/reset-password', resetPassword);
router.get('/me', authenticateJWT, me);

export default router;
