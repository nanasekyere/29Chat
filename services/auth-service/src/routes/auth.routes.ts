import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', validateRequest(authSchema), register);
router.post('/login', validateRequest(authSchema), login);

router.post('/refresh', (_req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});
router.post('/logout', (_req, res) => {
  res.status(501).json({ message: 'Not implemented' });
});


export default router;
