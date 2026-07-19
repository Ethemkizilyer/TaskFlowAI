import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeStats,
} from '../controllers/timeTrackingController';

const router = Router();

router.use(authenticate);

router.get('/', getTimeEntries);
router.post('/', createTimeEntry);
router.patch('/:id', updateTimeEntry);
router.delete('/:id', deleteTimeEntry);
router.get('/stats', getTimeStats);

export default router;
