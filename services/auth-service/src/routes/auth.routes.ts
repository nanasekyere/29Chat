import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', validateRequest(authSchema), register);
router.post('/login', validateRequest(authSchema), login);

router.post('/refresh')
router.post('/logout')


export default router;
