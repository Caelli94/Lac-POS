import express from 'express';
import { getOrganizationBySlug, createOrganization, getAllOrganizations, getOrganizationById, toggleFeature, updateOrganization, getSuperAdminStats, deleteOrganization, updateIntegrationsConfig } from '../controllers/orgController'

import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/by-slug/:slug', getOrganizationBySlug);

router.use(protect);

router.post('/', createOrganization);
router.get('/', getAllOrganizations);
router.get('/stats', getSuperAdminStats); // Added
router.get('/:id', getOrganizationById);
router.post('/:id/features', toggleFeature);
router.put('/:id', updateOrganization);
router.put('/:id/integrations', updateIntegrationsConfig);
router.delete('/:id', deleteOrganization);

export default router;
