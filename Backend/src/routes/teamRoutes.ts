
import { Router } from 'express';
import { getTeamMembers, addTeamMember, removeTeamMember, updateTeamMember } from '../controllers/teamController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.use(protect); // Secure all team routes

router.get('/:organizationId', getTeamMembers);
router.post('/', addTeamMember);
router.put('/:id', updateTeamMember);
router.delete('/:id', removeTeamMember);

export default router;
