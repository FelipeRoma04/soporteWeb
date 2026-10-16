import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import * as knowledgeController from '../controllers/KnowledgeController.js';
const router = Router();
router.use(requireAuth);
router.get('/', knowledgeController.list);
router.post('/', requireRole('admin'), knowledgeController.create);
export default router;