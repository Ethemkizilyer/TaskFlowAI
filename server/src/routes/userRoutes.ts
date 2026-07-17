import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requirePermission, requireAnyPermission } from '../middleware/admin';
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
} from '../controllers/userController';
import { getBoardActivity, getUserActivity } from '../controllers/activityController';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  broadcastNotification,
} from '../controllers/notificationController';

const router = Router();

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

router.patch('/profile', updateProfile);
router.patch('/profile/password', changePassword);
router.post('/avatar', upload.single('avatar'), uploadAvatar);

router.get('/activity', getUserActivity);
router.get('/activity/board/:boardId', getBoardActivity);

router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markAsRead);
router.patch('/notifications/read-all', markAllAsRead);
router.delete('/notifications/:id', deleteNotification);
router.post('/notifications/broadcast', requirePermission('users:manage'), broadcastNotification);

router.get('/admin/stats', requireAnyPermission(['analytics:view', 'analytics:view:global', 'analytics:view:department', 'analytics:view:team']), getStats);
router.post('/admin/users', requirePermission('users:manage'), createUser);
router.get('/admin/users', requireAnyPermission(['users:manage', 'users:approve', 'users:ban']), getAllUsers);
router.get('/admin/users/pending', requirePermission('users:approve'), getPendingUsers);
router.get('/admin/users/:id', requireAnyPermission(['users:manage', 'users:approve', 'users:ban']), getUserById);
router.patch('/admin/users/:id', requirePermission('users:manage'), adminUpdateUser);
router.delete('/admin/users/:id', requirePermission('users:manage'), deleteUser);
router.patch('/admin/users/:id/approve', requirePermission('users:approve'), approveUser);
router.patch('/admin/users/:id/ban', requirePermission('users:ban'), banUser);
router.patch('/admin/users/:id/unban', requirePermission('users:ban'), unbanUser);
router.patch('/admin/users/:id/role', requirePermission('users:role:change'), updateUserRole);
router.post('/admin/users/:id/reset-password', requirePermission('users:manage'), resetUserPassword);
router.post('/admin/users/bulk', requirePermission('users:manage'), bulkAction);

export default router;
