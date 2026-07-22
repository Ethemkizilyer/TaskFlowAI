import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createRecurringTask,
  getRecurringTasks,
  updateRecurringTask,
  deleteRecurringTask,
  toggleRecurringTask,
} from '../controllers/recurringTaskController';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/boards/{boardId}/recurring-tasks:
 *   get:
 *     summary: Get recurring tasks for a board
 *     tags: [Recurring Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of recurring tasks
 */
router.get('/:boardId/recurring-tasks', getRecurringTasks);

/**
 * @swagger
 * /api/boards/{boardId}/recurring-tasks:
 *   post:
 *     summary: Create a recurring task
 *     tags: [Recurring Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, frequency, nextRunAt]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               priority: { type: string, enum: [LOW, MEDIUM, HIGH, URGENT] }
 *               columnId: { type: string }
 *               assigneeId: { type: string }
 *               frequency: { type: string, enum: [DAILY, WEEKLY, MONTHLY] }
 *               interval: { type: integer, minimum: 1 }
 *               nextRunAt: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Recurring task created
 */
router.post('/:boardId/recurring-tasks', createRecurringTask);

/**
 * @swagger
 * /api/boards/{boardId}/recurring-tasks/{recurringTaskId}:
 *   patch:
 *     summary: Update a recurring task
 *     tags: [Recurring Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: recurringTaskId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               priority: { type: string, enum: [LOW, MEDIUM, HIGH, URGENT] }
 *               frequency: { type: string, enum: [DAILY, WEEKLY, MONTHLY] }
 *               interval: { type: integer }
 *               nextRunAt: { type: string, format: date-time }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Recurring task updated
 */
router.patch('/:boardId/recurring-tasks/:recurringTaskId', updateRecurringTask);

/**
 * @swagger
 * /api/boards/{boardId}/recurring-tasks/{recurringTaskId}:
 *   delete:
 *     summary: Delete a recurring task
 *     tags: [Recurring Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: recurringTaskId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Recurring task deleted
 */
router.delete('/:boardId/recurring-tasks/:recurringTaskId', deleteRecurringTask);

/**
 * @swagger
 * /api/boards/{boardId}/recurring-tasks/{recurringTaskId}/toggle:
 *   patch:
 *     summary: Toggle recurring task active state
 *     tags: [Recurring Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: recurringTaskId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Recurring task toggled
 */
router.patch('/:boardId/recurring-tasks/:recurringTaskId/toggle', toggleRecurringTask);

export default router;
