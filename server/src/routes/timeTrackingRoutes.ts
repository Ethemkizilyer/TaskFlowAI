import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeStats,
  startTimer,
  stopTimer,
  getActiveTimer,
  exportTimesheet,
} from '../controllers/timeTrackingController';

/**
 * @swagger tags:
 *   name: TimeTracking
 *   description: Zaman takibi ve kronometre
 */

const router = Router();

router.use(authenticate);

/**
 * @swagger /api/time-tracking:
 *   get:
 *     summary: Zaman kayıtlarını listele
 *     tags: [TimeTracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kayıt listesi
 */
router.get('/', getTimeEntries);

/**
 * @swagger /api/time-tracking:
 *   post:
 *     summary: Zaman kaydı ekle
 *     tags: [TimeTracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskTitle:
 *                 type: string
 *               duration:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Oluşturulan kayıt
 */
router.post('/', createTimeEntry);

/**
 * @swagger /api/time-tracking/{id}:
 *   patch:
 *     summary: Zaman kaydı güncelle
 *     tags: [TimeTracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               duration:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Güncellenmiş kayıt
 */
router.patch('/:id', updateTimeEntry);

/**
 * @swagger /api/time-tracking/{id}:
 *   delete:
 *     summary: Zaman kaydı sil
 *     tags: [TimeTracking]
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
 *         description: Silindi
 */
router.delete('/:id', deleteTimeEntry);

/**
 * @swagger /api/time-tracking/stats:
 *   get:
 *     summary: Zaman takip istatistikleri
 *     tags: [TimeTracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: İstatistikler
 */
router.get('/stats', getTimeStats);

/**
 * @swagger /api/time-tracking/start:
 *   post:
 *     summary: Kronometre başlat
 *     tags: [TimeTracking]
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
 *     responses:
 *       201:
 *         description: Kronometre başlatıldı
 */
router.post('/start', startTimer);

/**
 * @swagger /api/time-tracking/stop:
 *   post:
 *     summary: Kronometre durdur
 *     tags: [TimeTracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kronometre durduruldu
 */
router.post('/stop', stopTimer);

/**
 * @swagger /api/time-tracking/active:
 *   get:
 *     summary: Aktif kronometre
 *     tags: [TimeTracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aktif kronometre bilgisi
 */
router.get('/active', getActiveTimer);

/**
 * @swagger /api/time-tracking/export:
 *   get:
 *     summary: CSV dışa aktarım
 *     tags: [TimeTracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV dosyası
 */
router.get('/export', exportTimesheet);

export default router;
