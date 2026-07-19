import { Router } from 'express';
import { globalSearch, getDashboardStats, getCalendarTasks, getTeamPerformance } from '../controllers/searchController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/search', authenticate, globalSearch);
router.get('/dashboard-stats', authenticate, getDashboardStats);
router.get('/calendar/tasks', authenticate, getCalendarTasks);
router.get('/reports/team-performance', authenticate, getTeamPerformance);

export default router;
