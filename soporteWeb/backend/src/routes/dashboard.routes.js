import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as dashboardController from '../controllers/DashboardController.js';
const router = Router();
router.get('/', requireAuth, dashboardController.summary);
export default router;
