import { Router } from 'express';
import { globalSearch, getDashboardStats } from '../controllers/searchController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/search', authenticate, globalSearch);
router.get('/dashboard-stats', authenticate, getDashboardStats);

export default router;
