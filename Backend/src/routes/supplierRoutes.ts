import express from 'express';
import {
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierAccount,
    updateSupplierAccount,
    getAccountDetails,
    createAccountMovement,
    getSupplierStatistics,
    voidAccountMovement
} from '../controllers/supplierController';

import { protect, checkPermission } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/:orgId/statistics', getSupplierStatistics);
router.get('/:orgId', getSuppliers);
router.post('/', checkPermission('suppliers', 'create'), createSupplier);
router.put('/:id', checkPermission('suppliers', 'edit'), updateSupplier);
router.delete('/:id', checkPermission('suppliers', 'delete'), deleteSupplier);

// Account Routes
router.get('/:id/account', getSupplierAccount);
router.put('/:id/account', updateSupplierAccount);
router.get('/:id/account/details', getAccountDetails);
router.post('/:id/account/movements', createAccountMovement);
router.delete('/account/movements/:movementId', voidAccountMovement);

export default router;
