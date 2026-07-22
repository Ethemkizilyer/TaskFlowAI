import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  startSession,
  completeSession,
  getStats,
  getSessions,
} from '../controllers/focusController';

/**
 * @swagger tags:
 *   name: Focus
 *   description: Odak modu ve Pomodoro
 */

const router = Router();

router.use(authenticate);

/**
 * @swagger /api/focus/start:
 *   post:
 *     summary: Odak oturumu başlat
 *     tags: [Focus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskId:
 *                 type: string
 *               duration:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Oturum başlatıldı
 */
router.post('/start', startSession);

/**
 * @swagger /api/focus/{id}/complete:
 *   patch:
 *     summary: Odak oturumunu tamamla
 *     tags: [Focus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Oturum tamamlandı
 */
router.patch('/:id/complete', completeSession);

/**
 * @swagger /api/focus/stats:
 *   get:
 *     summary: Odak istatistikleri
 *     tags: [Focus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: İstatistikler
 */
router.get('/stats', getStats);

/**
 * @swagger /api/focus/sessions:
 *   get:
 *     summary: Odak oturumları listesi
 *     tags: [Focus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Oturum listesi
 */
router.get('/sessions', getSessions);

export default router;
