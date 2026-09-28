import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as aiController from '../controllers/AIController.js';
const router = Router();
router.use(requireAuth);
router.post('/chat', aiController.chat);
router.post('/interactions/:interactionId/feedback', aiController.feedback);
router.post('/analyze', aiController.analyze);
export default router;
