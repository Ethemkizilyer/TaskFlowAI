import { Router } from 'express';
import {
  getBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard,
  addMember,
  removeMember,
} from '../controllers/boardController';
import {
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  addComment,
  getComments,
} from '../controllers/taskController';
import { authenticate } from '../middleware/auth';
import taskDependencyRoutes from './taskDependencyRoutes';

/**
 * @swagger tags:
 *   name: Boards
 *   description: Pano ve görev yönetimi
 */

const router = Router();

router.use(authenticate);

/**
 * @swagger /api/boards:
 *   get:
 *     summary: Kullanıcının panolarını listele
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pano listesi
 */
router.get('/', getBoards);

/**
 * @swagger /api/boards:
 *   post:
 *     summary: Yeni pano oluştur
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Oluşturulan pano
 */
router.post('/', createBoard);

/**
 * @swagger /api/boards/{id}:
 *   get:
 *     summary: Pano detayı
 *     tags: [Boards]
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
 *         description: Pano detayı
 *       404:
 *         description: Pano bulunamadı
 */
router.get('/:id', getBoard);

/**
 * @swagger /api/boards/{id}:
 *   patch:
 *     summary: Pano güncelle
 *     tags: [Boards]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Güncellenmiş pano
 */
router.patch('/:id', updateBoard);

/**
 * @swagger /api/boards/{id}:
 *   delete:
 *     summary: Pano sil
 *     tags: [Boards]
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
 *       404:
 *         description: Pano bulunamadı
 */
router.delete('/:id', deleteBoard);

/**
 * @swagger /api/boards/{id}/members:
 *   post:
 *     summary: Panoya üye ekle
 *     tags: [Boards]
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
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [OWNER, ADMIN, MEMBER, VIEWER]
 *     responses:
 *       200:
 *         description: Üye eklendi
 */
router.post('/:id/members', addMember);

/**
 * @swagger /api/boards/{id}/members/{userId}:
 *   delete:
 *     summary: Panodan üye çıkar
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Üye çıkarıldı
 */
router.delete('/:id/members/:userId', removeMember);

/**
 * @swagger /api/boards/{boardId}/tasks:
 *   post:
 *     summary: Görev oluştur
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Oluşturulan görev
 */
router.post('/:boardId/tasks', createTask);

/**
 * @swagger /api/boards/{boardId}/tasks/{taskId}:
 *   patch:
 *     summary: Görev güncelle
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *     responses:
 *       200:
 *         description: Güncellenmiş görev
 */
router.patch('/:boardId/tasks/:taskId', updateTask);

/**
 * @swagger /api/boards/{boardId}/tasks/{taskId}/move:
 *   patch:
 *     summary: Görevi başka kolona taşı
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
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
 *               columnId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Taşındı
 */
router.patch('/:boardId/tasks/:taskId/move', moveTask);

/**
 * @swagger /api/boards/{boardId}/tasks/{taskId}:
 *   delete:
 *     summary: Görev sil
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Silindi
 */
router.delete('/:boardId/tasks/:taskId', deleteTask);

/**
 * @swagger /api/boards/{boardId}/tasks/{taskId}/comments:
 *   get:
 *     summary: Görev yorumlarını listele
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Yorum listesi
 */
router.get('/:boardId/tasks/:taskId/comments', getComments);

/**
 * @swagger /api/boards/{boardId}/tasks/{taskId}/comments:
 *   post:
 *     summary: Göreve yorum ekle
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: taskId
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
 *         description: Oluşturulan yorum
 */
router.post('/:boardId/tasks/:taskId/comments', addComment);

router.use('/:boardId/tasks', taskDependencyRoutes);

export default router;
