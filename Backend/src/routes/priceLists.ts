import express from 'express';
import { getPriceLists, upsertPriceList, deletePriceList, togglePriceListStatus } from '../controllers/priceListController';

import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/:orgId', getPriceLists);
router.post('/', upsertPriceList);
router.delete('/:id', deletePriceList);
router.put('/:id/status', togglePriceListStatus);

export default router;
