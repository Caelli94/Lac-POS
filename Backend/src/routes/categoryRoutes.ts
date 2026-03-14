import express from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';

import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/:orgId', getCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
