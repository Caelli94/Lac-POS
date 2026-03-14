import express from 'express';
import { getBranches, upsertBranch, deleteBranch } from '../controllers/branchController';

import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/:orgId', getBranches);
router.post('/', upsertBranch);
router.delete('/:id', deleteBranch);

export default router;
