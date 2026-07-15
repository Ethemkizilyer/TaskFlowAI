import { Router } from 'express';
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
  createUser,
} from '../controllers/userController';
import { getBoardActivity, getUserActivity } from '../controllers/activityController';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController';

const router = Router();

router.use(authenticate);

router.patch('/profile', updateProfile);
router.patch('/profile/password', changePassword);

router.get('/activity', getUserActivity);
router.get('/activity/board/:boardId', getBoardActivity);

router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markAsRead);
router.patch('/notifications/read-all', markAllAsRead);
router.delete('/notifications/:id', deleteNotification);

router.get('/admin/stats', requireAnyPermission(['analytics:view', 'analytics:view:global', 'analytics:view:department', 'analytics:view:team']), getStats);
router.post('/admin/users', requirePermission('users:manage'), createUser);
router.get('/admin/users', requireAnyPermission(['users:manage', 'users:approve', 'users:ban']), getAllUsers);
router.get('/admin/users/pending', requirePermission('users:approve'), getPendingUsers);
router.get('/admin/users/:id', requireAnyPermission(['users:manage', 'users:approve', 'users:ban']), getUserById);
router.patch('/admin/users/:id/approve', requirePermission('users:approve'), approveUser);
router.patch('/admin/users/:id/ban', requirePermission('users:ban'), banUser);
router.patch('/admin/users/:id/unban', requirePermission('users:ban'), unbanUser);
router.patch('/admin/users/:id/role', requirePermission('users:role:change'), updateUserRole);

export default router;
