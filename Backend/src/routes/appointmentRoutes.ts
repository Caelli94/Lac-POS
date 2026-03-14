import express from 'express';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '../controllers/appointmentController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/:orgId', checkPermission('appointments', 'view'), getAppointments);
router.post('/', checkPermission('appointments', 'create'), createAppointment);
router.put('/:id', checkPermission('appointments', 'edit'), updateAppointment);
router.delete('/:id', checkPermission('appointments', 'delete'), deleteAppointment);

export default router;
