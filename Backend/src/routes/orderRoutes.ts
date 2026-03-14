import express from 'express';
import { getOrders, createOrder, updateOrder, deleteOrder } from '../controllers/orderController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/:orgId')
    .get(protect, getOrders);

router.route('/')
    .post(protect, createOrder);

router.route('/:id')
    .put(protect, updateOrder)
    .delete(protect, deleteOrder);

export default router;
