import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  addDependency,
  removeDependency,
  getDependencies,
  getBoardDependencies,
} from '../controllers/taskDependencyController';

const router = Router();

/**
 * @swagger
 * /boards/{boardId}/tasks/{taskId}/dependencies:
 *   get:
 *     summary: Get task dependencies
 *     tags: [Task Dependencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task dependencies retrieved
 *       404:
 *         description: Task not found
 */
router.get('/:taskId/dependencies', getDependencies);

/**
 * @swagger
 * /boards/{boardId}/tasks/{taskId}/dependencies:
 *   post:
 *     summary: Add a task dependency
 *     tags: [Task Dependencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dependsOnId]
 *             properties:
 *               dependsOnId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Dependency added
 *       400:
 *         description: Invalid dependency or circular dependency
 */
router.post('/:taskId/dependencies', addDependency);

/**
 * @swagger
 * /boards/{boardId}/tasks/{taskId}/dependencies/{dependsOnId}:
 *   delete:
 *     summary: Remove a task dependency
 *     tags: [Task Dependencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: dependsOnId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dependency removed
 *       404:
 *         description: Task or dependency not found
 */
router.delete('/:taskId/dependencies/:dependsOnId', removeDependency);

/**
 * @swagger
 * /boards/{boardId}/dependencies:
 *   get:
 *     summary: Get all task dependencies for a board
 *     tags: [Task Dependencies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Board dependencies retrieved
 */
router.get('/dependencies', getBoardDependencies);

export default router;
