import { Router } from 'express';
import { globalSearch, getDashboardStats, getCalendarTasks, getTeamPerformance } from '../controllers/searchController';
import { authenticate } from '../middleware/auth';

/**
 * @swagger tags:
 *   name: Search
 *   description: Arama ve raporlar
 */

const router = Router();

/**
 * @swagger /api/search:
 *   get:
 *     summary: Global arama
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Arama sonuçları
 */
router.get('/search', authenticate, globalSearch);

/**
 * @swagger /api/dashboard-stats:
 *   get:
 *     summary: Panel istatistikleri
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: İstatistikler
 */
router.get('/dashboard-stats', authenticate, getDashboardStats);

/**
 * @swagger /api/calendar/tasks:
 *   get:
 *     summary: Takvim görevleri
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Takvim görevleri
 */
router.get('/calendar/tasks', authenticate, getCalendarTasks);

/**
 * @swagger /api/reports/team-performance:
 *   get:
 *     summary: Takım performans raporu
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performans raporu
 */
router.get('/reports/team-performance', authenticate, getTeamPerformance);

export default router;
