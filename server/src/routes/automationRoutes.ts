import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAutomations,
  createAutomation,
  toggleAutomation,
  deleteAutomation,
  getTriggersAndActions,
} from '../controllers/automationController';

const router = Router();

router.use(authenticate);

router.get('/', getAutomations);
router.get('/options', getTriggersAndActions);
router.post('/', createAutomation);
router.patch('/:id/toggle', toggleAutomation);
router.delete('/:id', deleteAutomation);

export default router;
