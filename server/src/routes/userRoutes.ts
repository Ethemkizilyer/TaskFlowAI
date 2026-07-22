import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requirePermission, requireAnyPermission } from '../middleware/admin';
import { AuthenticatedRequest, ApiResponse } from '../types';
import {
  getAllUsers,
  getUserById,
  approveUser,
  banUser,
  unbanUser,
  updateUserRole,
  getPendingUsers,
  getStats,
  updateProfile,
  changePassword,
  uploadAvatar,
  createUser,
  adminUpdateUser,
  deleteUser,
  resetUserPassword,
  bulkAction,
  getUsersForSelect,
} from '../controllers/userController';
import { getBoardActivity, getUserActivity } from '../controllers/activityController';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  broadcastNotification,
} from '../controllers/notificationController';

/**
 * @swagger tags:
 *   name: Users
 *   description: Kullanıcı yönetimi, profil, bildirimler ve admin işlemleri
 */

const router = Router();

router.param('id', (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction, value: string) => {
  const parsed = z.string().cuid().safeParse(value);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid id' });
    return;
  }
  next();
});

const uploadsDir = path.resolve(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${(req as any).userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, and GIF files are allowed'));
  },
});

router.use(authenticate);

/**
 * @swagger /api/users/profile:
 *   patch:
 *     summary: Profil güncelle
 *     tags: [Users]
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
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Güncellenmiş profil
 */
router.patch('/profile', updateProfile);

/**
 * @swagger /api/users/profile/password:
 *   patch:
 *     summary: Şifre değiştir
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Şifre değiştirildi
 *       400:
 *         description: Şifreler eşleşmiyor
 */
router.patch('/profile/password', changePassword);

/**
 * @swagger /api/users/avatar:
 *   post:
 *     summary: Avatar yükle
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Yüklenen avatar
 */
router.post('/avatar', upload.single('avatar'), uploadAvatar);

/**
 * @swagger /api/users/activity:
 *   get:
 *     summary: Kullanıcı aktiviteleri
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aktivite listesi
 */
router.get('/activity', getUserActivity);

/**
 * @swagger /api/users/activity/board/{boardId}:
 *   get:
 *     summary: Pano aktiviteleri
 *     tags: [Users]
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
 *         description: Pano aktiviteleri
 */
router.get('/activity/board/:boardId', getBoardActivity);

/**
 * @swagger /api/users/notifications:
 *   get:
 *     summary: Bildirimleri listele
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bildirim listesi
 */
router.get('/notifications', getNotifications);

/**
 * @swagger /api/users/notifications/{id}/read:
 *   patch:
 *     summary: Bildirimi okundu işaretle
 *     tags: [Users]
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
 *         description: Okundu
 */
router.patch('/notifications/:id/read', markAsRead);

/**
 * @swagger /api/users/notifications/read-all:
 *   patch:
 *     summary: Tüm bildirimleri okundu işaretle
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tümü okundu
 */
router.patch('/notifications/read-all', markAllAsRead);

/**
 * @swagger /api/users/notifications/{id}:
 *   delete:
 *     summary: Bildirim sil
 *     tags: [Users]
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
router.delete('/notifications/:id', deleteNotification);

/**
 * @swagger /api/users/notifications/broadcast:
 *   post:
 *     summary: Tüm kullanıcılara bildirim gönder (admin)
 *     tags: [Users]
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
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bildirim gönderildi
 *       403:
 *         description: Yetkisiz
 */
router.post('/notifications/broadcast', requirePermission('users:manage'), broadcastNotification);

/**
 * @swagger /api/users/admin/stats:
 *   get:
 *     summary: Admin istatistikleri
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: İstatistikler
 *       403:
 *         description: Yetkisiz
 */
router.get('/admin/stats', requireAnyPermission(['analytics:view', 'analytics:view:global', 'analytics:view:department', 'analytics:view:team']), getStats);

/**
 * @swagger /api/users/admin/users:
 *   post:
 *     summary: Yeni kullanıcı oluştur (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, DIRECTOR, MANAGER, TEAM_LEADER, TEAM_MEMBER, PERSONNEL]
 *     responses:
 *       201:
 *         description: Oluşturulan kullanıcı
 *       403:
 *         description: Yetkisiz
 */
router.post('/admin/users', requirePermission('users:manage'), createUser);

/**
 * @swagger /api/users/admin/users:
 *   get:
 *     summary: Tüm kullanıcıları listele (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı listesi
 *       403:
 *         description: Yetkisiz
 */
router.get('/admin/users', requireAnyPermission(['users:manage', 'users:approve', 'users:ban']), getAllUsers);

/**
 * @swagger /api/users/select:
 *   get:
 *     summary: Kullanıcı listesi (select/multiselect için)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Kullanıcı listesi (id, name, email, avatar, role)
 */
router.get('/select', authenticate, getUsersForSelect);

/**
 * @swagger /api/users/admin/users/pending:
 *   get:
 *     summary: Onay bekleyen kullanıcılar
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bekleyen kullanıcı listesi
 */
router.get('/admin/users/pending', requirePermission('users:approve'), getPendingUsers);

/**
 * @swagger /api/users/admin/users/{id}:
 *   get:
 *     summary: Kullanıcı detayı (admin)
 *     tags: [Users]
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
 *         description: Kullanıcı detayı
 *       404:
 *         description: Kullanıcı bulunamadı
 */
router.get('/admin/users/:id', requireAnyPermission(['users:manage', 'users:approve', 'users:ban']), getUserById);

/**
 * @swagger /api/users/admin/users/{id}:
 *   patch:
 *     summary: Kullanıcı güncelle (admin)
 *     tags: [Users]
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
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Güncellenmiş kullanıcı
 */
router.patch('/admin/users/:id', requirePermission('users:manage'), adminUpdateUser);

/**
 * @swagger /api/users/admin/users/{id}:
 *   delete:
 *     summary: Kullanıcı sil (admin)
 *     tags: [Users]
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
router.delete('/admin/users/:id', requirePermission('users:manage'), deleteUser);

/**
 * @swagger /api/users/admin/users/{id}/approve:
 *   patch:
 *     summary: Kullanıcı onayla
 *     tags: [Users]
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
 *         description: Onaylandı
 */
router.patch('/admin/users/:id/approve', requirePermission('users:approve'), approveUser);

/**
 * @swagger /api/users/admin/users/{id}/ban:
 *   patch:
 *     summary: Kullanıcı yasakla
 *     tags: [Users]
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
 *         description: Yasaklandı
 */
router.patch('/admin/users/:id/ban', requirePermission('users:ban'), banUser);

/**
 * @swagger /api/users/admin/users/{id}/unban:
 *   patch:
 *     summary: Kullanıcı yasağını kaldır
 *     tags: [Users]
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
 *         description: Yasak kaldırıldı
 */
router.patch('/admin/users/:id/unban', requirePermission('users:ban'), unbanUser);

/**
 * @swagger /api/users/admin/users/{id}/role:
 *   patch:
 *     summary: Kullanıcı rolü değiştir
 *     tags: [Users]
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
 *               role:
 *                 type: string
 *                 enum: [ADMIN, DIRECTOR, MANAGER, TEAM_LEADER, TEAM_MEMBER, PERSONNEL]
 *     responses:
 *       200:
 *         description: Rol güncellendi
 */
router.patch('/admin/users/:id/role', requirePermission('users:role:change'), updateUserRole);

/**
 * @swagger /api/users/admin/users/{id}/reset-password:
 *   post:
 *     summary: Kullanıcı şifresini sıfırla (admin)
 *     tags: [Users]
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
 *         description: Şifre sıfırlandı
 */
router.post('/admin/users/:id/reset-password', requirePermission('users:manage'), resetUserPassword);

/**
 * @swagger /api/users/admin/users/bulk:
 *   post:
 *     summary: Toplu kullanıcı işlemi (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Toplu işlem tamamlandı
 */
router.post('/admin/users/bulk', requirePermission('users:manage'), bulkAction);

export default router;
