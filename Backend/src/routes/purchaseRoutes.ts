import express from 'express';
import { getPurchases, createPurchase } from '../controllers/purchaseController';

import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/:orgId', getPurchases);
router.post('/', createPurchase);

export default router;
