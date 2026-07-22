import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getConversations,
  getConversation,
  getMessages,
  createConversation,
  sendMessage,
  markConversationRead,
  getOnlineUsers,
} from '../controllers/messageController';

/**
 * @swagger tags:
 *   name: Messages
 *   description: Mesajlaşma ve konuşmalar
 */

const router = Router();

router.use(authenticate);

/**
 * @swagger /api/messages/conversations:
 *   get:
 *     summary: Konuşmaları listele
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Konuşma listesi
 */
router.get('/conversations', getConversations);

/**
 * @swagger /api/messages/conversations:
 *   post:
 *     summary: Yeni konuşma oluştur
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [DIRECT, GROUP]
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: Oluşturulan konuşma
 */
router.post('/conversations', createConversation);

/**
 * @swagger /api/messages/conversations/{id}:
 *   get:
 *     summary: Konuşma detayı
 *     tags: [Messages]
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
 *         description: Konuşma detayı
 */
router.get('/conversations/:id', getConversation);

/**
 * @swagger /api/messages/conversations/{id}/messages:
 *   get:
 *     summary: Konuşma mesajlarını listele
 *     tags: [Messages]
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
 *         description: Mesaj listesi
 */
router.get('/conversations/:id/messages', getMessages);

/**
 * @swagger /api/messages/conversations/{id}/messages:
 *   post:
 *     summary: Mesaj gönder
 *     tags: [Messages]
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
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Gönderilen mesaj
 */
router.post('/conversations/:id/messages', sendMessage);

/**
 * @swagger /api/messages/conversations/{id}/read:
 *   patch:
 *     summary: Konuşmayı okundu işaretle
 *     tags: [Messages]
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
 *         description: Okundu olarak işaretlendi
 */
router.patch('/conversations/:id/read', markConversationRead);

/**
 * @swagger /api/messages/online-users:
 *   get:
 *     summary: Çevrimiçi kullanıcıları listele
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Çevrimiçi kullanıcı listesi
 */
router.get('/online-users', getOnlineUsers);

export default router;
