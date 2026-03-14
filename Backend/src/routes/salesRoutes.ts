import express from 'express';
import { createSale, getSales, cancelSale, getSaleById } from '../controllers/salesController';

import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.post('/', createSale);
router.get('/:orgId', getSales);
router.get('/detail/:id', getSaleById);
router.post('/:id/cancel', cancelSale);

export default router;
