import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import * as knowledgeController from '../controllers/KnowledgeController.js';
const router = Router();
router.get('/', knowledgeController.list);
router.post('/', requireAuth, requireRole('admin'), knowledgeController.create);
export default router;
