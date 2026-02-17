import { Router } from 'express';
import * as controller from '../controllers/auth.controller';
import { validateRequest, validateRefreshToken } from '../middleware/validation.middleware';
import { authSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', validateRequest(authSchema), controller.register);
router.post('/login', validateRequest(authSchema), controller.login);
router.post('/refresh', validateRefreshToken, controller.refreshToken);
router.post('/logout', validateRefreshToken, controller.logout);


export default router;
