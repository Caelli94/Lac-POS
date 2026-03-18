import express from 'express';
import { createSale, getSales, cancelSale, getSaleById, getUserCommissions } from '../controllers/salesController';

import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.post('/', createSale);
router.get('/commissions/:userId', getUserCommissions);
router.get('/:orgId', getSales);
router.get('/detail/:id', getSaleById);
router.post('/:id/cancel', cancelSale);

export default router;
