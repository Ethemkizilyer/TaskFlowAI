import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

/**
 * @swagger tags:
 *   name: Auth
 *   description: Kimlik doğrulama ve hesap yönetimi
 */

const router = Router();

/**
 * @swagger /api/auth/register:
 *   post:
 *     summary: Yeni kullanıcı kaydı
 *     tags: [Auth]
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
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: Kayıt başarılı
 *       400:
 *         description: Geçersiz giriş
 */
router.post('/register', register);

/**
 * @swagger /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Giriş başarılı, JWT döner
 *       401:
 *         description: Hatalı kimlik bilgileri
 */
router.post('/login', login);

/**
 * @swagger /api/auth/refresh:
 *   post:
 *     summary: Access token yenile
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Yeni access token
 *       401:
 *         description: Geçersiz refresh token
 */
router.post('/refresh', refresh);

/**
 * @swagger /api/auth/logout:
 *   post:
 *     summary: Çıkış yap
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Çıkış başarılı
 */
router.post('/logout', logout);

/**
 * @swagger /api/auth/me:
 *   get:
 *     summary: Mevcut kullanıcı bilgisi
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı bilgisi
 *       401:
 *         description: Yetkisiz
 */
router.get('/me', authenticate, getMe);

/**
 * @swagger /api/auth/me:
 *   patch:
 *     summary: Profil güncelle
 *     tags: [Auth]
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
 *         description: Güncellenmiş kullanıcı
 *       401:
 *         description: Yetkisiz
 */
router.patch('/me', authenticate, updateProfile);

export default router;
