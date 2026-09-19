import { Router } from 'express';
import {
  handleCreateConversation,
  handleListConversations,
  handleGetConversation,
  handleDeleteConversation,
  handleUpdateConversation,
  handleGetMessages,
} from '../controllers/conversationController';

const router = Router();

router.post('/', handleCreateConversation);
router.get('/', handleListConversations);
router.get('/:id', handleGetConversation);
router.delete('/:id', handleDeleteConversation);
router.patch('/:id', handleUpdateConversation);
router.get('/:id/messages', handleGetMessages);

export default router;
