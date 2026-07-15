import { Router } from 'express';
import {
  getAIStatus,
  suggestPriority,
  suggestTags,
  generateSubtasks,
  analyzeBoard,
  generateTaskFromDescription,
} from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/status', getAIStatus);
router.post('/suggest-priority', suggestPriority);
router.post('/suggest-tags', suggestTags);
router.post('/generate-subtasks', generateSubtasks);
router.post('/generate-task', generateTaskFromDescription);
router.post('/analyze-board/:boardId', analyzeBoard);

export default router;
