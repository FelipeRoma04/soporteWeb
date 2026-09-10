import { Router } from 'express';
import * as authController from '../controllers/AuthController.js';
const router = Router();
router.post('/register', authController.register);
router.post('/login', authController.login);
export default router;
