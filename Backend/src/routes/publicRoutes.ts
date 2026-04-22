import { Router } from 'express';
import { publicBookingController } from '../controllers/publicBookingController';

const router = Router();

// Estas rutas NO requieren el middleware de auth
router.get('/org/:slug', publicBookingController.getOrgPublicDetails);
router.get('/professionals/:orgId', publicBookingController.getProfessionals);
router.post('/book', publicBookingController.createAppointment);

export default router;
