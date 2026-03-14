import express from 'express';
import { getChecks, createCheck, updateCheck, deleteCheck } from '../controllers/checkController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
    .post(protect, createCheck);

router.route('/:organizationId')
    .get(protect, getChecks);

router.route('/:id')
    .put(protect, updateCheck)
    .delete(protect, deleteCheck);

export default router;
