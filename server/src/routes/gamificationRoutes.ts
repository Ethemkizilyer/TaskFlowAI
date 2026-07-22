import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMyStats, getLeaderboard, getUserAchievements } from '../controllers/gamificationController';

/**
 * @swagger tags:
 *   name: Gamification
 *   description: XP, seviyeler, rozetler ve liderlik tablosu
 */

const router = Router();

router.use(authenticate);

/**
 * @swagger /api/gamification/stats:
 *   get:
 *     summary: Kullanıcı oyunlaştırma istatistikleri
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: XP, seviye, streak ve rozet bilgileri
 */
router.get('/stats', getMyStats);

/**
 * @swagger /api/gamification/leaderboard:
 *   get:
 *     summary: Liderlik tablosu
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: En yüksek XP'ye sahip 10 kullanıcı
 */
router.get('/leaderboard', getLeaderboard);

/**
 * @swagger /api/gamification/achievements:
 *   get:
 *     summary: Kullanıcı rozetleri
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Açık ve kilitli rozetler
 */
router.get('/achievements', getUserAchievements);

export default router;
