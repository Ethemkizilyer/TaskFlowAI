import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getConversations,
  getConversation,
  getMessages,
  createConversation,
  sendMessage,
  markConversationRead,
  getOnlineUsers,
} from '../controllers/messageController';

const router = Router();

router.use(authenticate);

router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.patch('/conversations/:id/read', markConversationRead);
router.get('/online-users', getOnlineUsers);

export default router;
