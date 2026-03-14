import express from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, checkSku, getProductStatistics, massUpdatePrices } from '../controllers/productController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router = express.Router();

// Public Routes (if any)

// Protected Routes
router.use(protect);

router.get('/check-sku/:orgId', checkPermission('inventory'), checkSku);
router.get('/:orgId/statistics', checkPermission('inventory'), getProductStatistics);
router.get('/:orgId', checkPermission('inventory'), getProducts);
router.get('/detail/:id', checkPermission('inventory'), getProductById);
router.post('/mass-update', checkPermission('inventory', 'edit'), massUpdatePrices);
router.post('/', checkPermission('inventory', 'create'), createProduct);
router.put('/:id', checkPermission('inventory', 'edit'), updateProduct);
router.delete('/:id', checkPermission('inventory', 'delete'), deleteProduct);

export default router;
