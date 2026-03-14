import { Router } from 'express';
import { getStockLots, adjustStockLot, deleteStockLot, createStockLot } from '../controllers/stockLotController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.get('/:orgId', getStockLots);
router.post('/:orgId', createStockLot);
router.patch('/:orgId/:id/adjust', adjustStockLot);
router.delete('/:orgId/:id', deleteStockLot);

export default router;
