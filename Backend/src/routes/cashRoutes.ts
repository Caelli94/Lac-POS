import express from 'express';
import { registerMovement, getCashRegister, retrieveRegistersByOrg, upsertRegister, deleteRegister, getRegisterMovements, deleteMovement } from '../controllers/cashController';
import { protect } from '../middlewares/authMiddleware';

import { openSession, closeSession, getActiveSession, getSessionHistory, getSessionDetails, getOrganizationHistory } from '../controllers/cashSessionController';

const router = express.Router();

router.use(protect);

// Movements
// Movements
router.post('/movements', registerMovement);
router.delete('/movements/:id', deleteMovement);

// Registers
router.post('/registers', upsertRegister); // Upsert (Create/Update)
router.delete('/registers/:id', deleteRegister);
router.get('/registers/:id', getCashRegister);
router.get('/registers/org/:orgId', retrieveRegistersByOrg);
router.get('/registers/:registerId/session', getActiveSession);
router.get('/registers/:registerId/history', getSessionHistory);
router.get('/registers/:id/movements', getRegisterMovements);

// Org History
router.get('/org/:organizationId/history', getOrganizationHistory);

// Sessions
router.post('/sessions/open', openSession);
router.post('/sessions/:id/close', closeSession);
router.get('/sessions/:id/details', getSessionDetails);

export default router;
