import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createCustomField,
  getCustomFields,
  updateCustomField,
  deleteCustomField,
  getTaskValues,
  setTaskValue,
} from '../controllers/customFieldController';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/boards/{boardId}/custom-fields:
 *   get:
 *     summary: Get custom fields for a board
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of custom fields
 */
router.get('/:boardId/custom-fields', getCustomFields);

/**
 * @swagger
 * /api/boards/{boardId}/custom-fields:
 *   post:
 *     summary: Create a custom field
 *     tags: [Custom Fields]
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
 *             required: [name, type]
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [TEXT, NUMBER, DATE, SELECT, CHECKBOX] }
 *               options: { type: array, items: { type: string } }
 *               required: { type: boolean }
 *               position: { type: integer }
 *     responses:
 *       201:
 *         description: Custom field created
 */
router.post('/:boardId/custom-fields', createCustomField);

/**
 * @swagger
 * /api/boards/{boardId}/custom-fields/{fieldId}:
 *   patch:
 *     summary: Update a custom field
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: fieldId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [TEXT, NUMBER, DATE, SELECT, CHECKBOX] }
 *               options: { type: array, items: { type: string } }
 *               required: { type: boolean }
 *               position: { type: integer }
 *     responses:
 *       200:
 *         description: Custom field updated
 */
router.patch('/:boardId/custom-fields/:fieldId', updateCustomField);

/**
 * @swagger
 * /api/boards/{boardId}/custom-fields/{fieldId}:
 *   delete:
 *     summary: Delete a custom field
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: fieldId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Custom field deleted
 */
router.delete('/:boardId/custom-fields/:fieldId', deleteCustomField);

/**
 * @swagger
 * /api/tasks/{taskId}/custom-fields:
 *   get:
 *     summary: Get custom field values for a task
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Task custom field values
 */
router.get('/tasks/:taskId/custom-fields', getTaskValues);

/**
 * @swagger
 * /api/tasks/{taskId}/custom-fields/{fieldId}:
 *   put:
 *     summary: Set a custom field value for a task
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: fieldId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Custom field value set
 */
router.put('/tasks/:taskId/custom-fields/:fieldId', setTaskValue);

export default router;
