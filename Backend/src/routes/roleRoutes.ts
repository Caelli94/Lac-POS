import express from 'express';
import {
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    seedRoles
} from '../controllers/roleController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/:organizationId').get(protect, getRoles);
router.route('/').post(protect, createRole);
router.route('/:id')
    .put(protect, updateRole)
    .delete(protect, deleteRole);

router.post('/seed/:organizationId', protect, seedRoles);

export default router;
