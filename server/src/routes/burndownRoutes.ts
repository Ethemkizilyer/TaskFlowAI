import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getBurndown } from '../controllers/burndownController';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/boards/{boardId}/burndown:
 *   get:
 *     summary: Get burndown chart data for a board
 *     tags: [Burndown]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Burndown data with daily remaining/ideal counts
 *       404:
 *         description: Board not found
 */
router.get('/burndown', getBurndown);

export default router;
