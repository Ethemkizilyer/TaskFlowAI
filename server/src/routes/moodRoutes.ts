import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createCheckin,
  getTodayCheckin,
  getTeamPulse,
  getMyHistory,
} from '../controllers/moodController';

const router = Router();

router.use(authenticate);

router.post('/checkin', createCheckin);
router.get('/today', getTodayCheckin);
router.get('/team', getTeamPulse);
router.get('/history', getMyHistory);

export default router;
