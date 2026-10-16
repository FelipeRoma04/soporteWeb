import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import * as categoryController from '../controllers/CategoryController.js';
const router = Router();
router.get('/', requireAuth, categoryController.list);
router.post('/', requireAuth, requireRole('admin'), categoryController.create);
export default router;
