import express from 'express';
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer, getCustomerAccount, updateCustomerAccount, getAccountDetails, createAccountMovement, getCustomerStatistics, voidAccountMovement } from '../controllers/customerController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

// Routes
router.get('/:orgId/statistics', getCustomerStatistics);
router.get('/:orgId', getCustomers);
// Detail view likely just needs module access or maybe view? Leaving as basic protect for now or checkPermission('customers')
router.get('/detail/:id', checkPermission('customers'), getCustomerById);
router.post('/', checkPermission('customers', 'create'), createCustomer);
router.put('/:id', checkPermission('customers', 'edit'), updateCustomer);
router.delete('/:id', checkPermission('customers', 'delete'), deleteCustomer);
router.get('/:id/account', getCustomerAccount);
router.put('/:id/account', updateCustomerAccount);

// Account Movements
router.get('/:id/account/details', getAccountDetails);
router.post('/:id/account/movements', createAccountMovement);
router.delete('/account/movements/:movementId', voidAccountMovement);

export default router;
