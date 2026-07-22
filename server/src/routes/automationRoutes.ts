import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAutomations,
  createAutomation,
  toggleAutomation,
  deleteAutomation,
  getTriggersAndActions,
} from '../controllers/automationController';

/**
 * @swagger tags:
 *   name: Automation
 *   description: Otomasyon kuralları
 */

const router = Router();

router.use(authenticate);

/**
 * @swagger /api/automations:
 *   get:
 *     summary: Otomasyonları listele
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Otomasyon listesi
 */
router.get('/', getAutomations);

/**
 * @swagger /api/automations/options:
 *   get:
 *     summary: Tetikleyici ve aksiyon seçenekleri
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Seçenekler
 */
router.get('/options', getTriggersAndActions);

/**
 * @swagger /api/automations:
 *   post:
 *     summary: Otomasyon oluştur
 *     tags: [Automation]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               trigger:
 *                 type: string
 *               action:
 *                 type: string
 *               boardId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Oluşturulan otomasyon
 */
router.post('/', createAutomation);

/**
 * @swagger /api/automations/{id}/toggle:
 *   patch:
 *     summary: Otomasyonu aktif/pasif değiştir
 *     tags: [Automation]
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
 *         description: Durum değişti
 */
router.patch('/:id/toggle', toggleAutomation);

/**
 * @swagger /api/automations/{id}:
 *   delete:
 *     summary: Otomasyon sil
 *     tags: [Automation]
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
router.delete('/:id', deleteAutomation);

export default router;
