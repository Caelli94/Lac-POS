import { Router } from 'express';
import { processImport } from '../controllers/importController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// POST /api/import/:module
// Protected by Auth
router.post('/:module', protect, processImport);

export default router;
