import { Router } from 'express';
import * as professionalController from '../controllers/professionalController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect);

router.get('/:orgId', professionalController.getProfessionals);
router.post('/', professionalController.createProfessional);
router.put('/:id', professionalController.updateProfessional);
router.delete('/:id', professionalController.deleteProfessional);

export default router;
