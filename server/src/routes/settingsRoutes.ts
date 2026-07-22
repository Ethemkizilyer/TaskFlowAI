import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getSettings, updateSettings } from '../controllers/settingsController';

/**
 * @swagger tags:
 *   name: Settings
 *   description: Organizasyon ayarları
 */

const router = Router();

router.use(authenticate);

/**
 * @swagger /api/settings:
 *   get:
 *     summary: Ayarları getir
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ayarlar
 */
router.get('/', getSettings);

/**
 * @swagger /api/settings:
 *   put:
 *     summary: Ayarları güncelle
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Güncellenmiş ayarlar
 */
router.put('/', updateSettings);

export default router;
