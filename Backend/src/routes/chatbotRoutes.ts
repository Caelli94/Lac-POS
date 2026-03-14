import { Router } from 'express';
import { askChatbot } from '../controllers/chatbotController';
import { chatbotLimiter } from '../middlewares/securityMiddleware';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router = Router();

// El permiso 'ai_assistant' debe existir en la DB para el rol del usuario
router.post('/ask', protect, checkPermission('ai_assistant', 'view'), chatbotLimiter, askChatbot);

export default router;
