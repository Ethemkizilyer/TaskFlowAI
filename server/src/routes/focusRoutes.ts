import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  startSession,
  completeSession,
  getStats,
  getSessions,
} from '../controllers/focusController';

const router = Router();

router.use(authenticate);

router.post('/start', startSession);
router.patch('/:id/complete', completeSession);
router.get('/stats', getStats);
router.get('/sessions', getSessions);

export default router;
