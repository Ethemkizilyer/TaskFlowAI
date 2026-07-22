import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createCheckin,
  getTodayCheckin,
  getTeamPulse,
  getMyHistory,
} from '../controllers/moodController';

/**
 * @swagger tags:
 *   name: Mood
 *   description: Takım ruhu ve durum bildirimi
 */

const router = Router();

router.use(authenticate);

/**
 * @swagger /api/mood/checkin:
 *   post:
 *     summary: Günlük durum bildirimi
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mood:
 *                 type: string
 *                 enum: [GREAT, GOOD, OKAY, STRESSED, OVERWHELMED]
 *               stress:
 *                 type: integer
 *               workload:
 *                 type: integer
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Bildirim kaydedildi
 */
router.post('/checkin', createCheckin);

/**
 * @swagger /api/mood/today:
 *   get:
 *     summary: Bugünkü durum bildirimi
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bugünkü bildirim
 */
router.get('/today', getTodayCheckin);

/**
 * @swagger /api/mood/team:
 *   get:
 *     summary: Takım ruh hali
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Takım pulse verisi
 */
router.get('/team', getTeamPulse);

/**
 * @swagger /api/mood/history:
 *   get:
 *     summary: Durum bildirimi geçmişi
 *     tags: [Mood]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Geçmiş bildirimler
 */
router.get('/history', getMyHistory);

export default router;
