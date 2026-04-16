import express from 'express';
import { getRules, createRule, updateRule, deleteRule, getHistory } from '../controllers/commissionController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Protected Routes
router.use(protect);

// Rules
router.get('/rules/:orgId', getRules);
router.post('/rules', createRule);
router.patch('/rules/:id', updateRule);
router.delete('/rules/:id', deleteRule);

// History
router.get('/history/:orgId', getHistory);

export default router;
