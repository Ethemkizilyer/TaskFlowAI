import { Router } from 'express';
import {
  getAIStatus,
  suggestPriority,
  suggestTags,
  generateSubtasks,
  analyzeBoard,
  generateTaskFromDescription,
  getDailyBriefing,
  chatWithAI,
} from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

/**
 * @swagger tags:
 *   name: AI
 *   description: Yapay zeka özellikleri
 */

const router = Router();

router.use(authenticate);

/**
 * @swagger /api/ai/status:
 *   get:
 *     summary: AI servis durumu
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI durumu
 */
router.get('/status', getAIStatus);

/**
 * @swagger /api/ai/daily-briefing:
 *   get:
 *     summary: Günlük AI brifingi
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Günlük brifing
 */
router.get('/daily-briefing', getDailyBriefing);

/**
 * @swagger /api/ai/suggest-priority:
 *   post:
 *     summary: AI öncelik önerisi
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Öncelik önerileri
 */
router.post('/suggest-priority', suggestPriority);

/**
 * @swagger /api/ai/suggest-tags:
 *   post:
 *     summary: AI etiket önerisi
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Etiket önerileri
 */
router.post('/suggest-tags', suggestTags);

/**
 * @swagger /api/ai/generate-subtasks:
 *   post:
 *     summary: AI alt görev üretimi
 *     tags: [AI]
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
 *       200:
 *         description: Alt görevler
 */
router.post('/generate-subtasks', generateSubtasks);

/**
 * @swagger /api/ai/generate-task:
 *   post:
 *     summary: AI görev üretimi
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Oluşturulan görev
 */
router.post('/generate-task', generateTaskFromDescription);

/**
 * @swagger /api/ai/analyze-board/{boardId}:
 *   post:
 *     summary: Pano AI analizi
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pano analizi
 */
router.post('/analyze-board/:boardId', analyzeBoard);

/**
 * @swagger
 * /api/ai/chat:
 *   post:
 *     summary: AI chatbot for natural language task management
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *               history:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: AI chatbot response
 */
router.post('/chat', chatWithAI);

export default router;
