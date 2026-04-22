import express from 'express';
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from '../controllers/appointmentController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/:orgId', getAppointments);
router.post('/', createAppointment);
router.put('/:id', updateAppointment);
router.delete('/:id', deleteAppointment);

export default router;
