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

const router = Router();

router.use(authenticate);

router.get('/', getBoards);
router.post('/', createBoard);
router.get('/:id', getBoard);
router.patch('/:id', updateBoard);
router.delete('/:id', deleteBoard);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

router.post('/:boardId/tasks', createTask);
router.patch('/:boardId/tasks/:taskId', updateTask);
router.patch('/:boardId/tasks/:taskId/move', moveTask);
router.delete('/:boardId/tasks/:taskId', deleteTask);

router.get('/:boardId/tasks/:taskId/comments', getComments);
router.post('/:boardId/tasks/:taskId/comments', addComment);

export default router;
