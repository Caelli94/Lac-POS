import express from 'express';
import { getTicketSettings, upsertTicketSettings } from '../controllers/ticketSettingsController';

import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/:orgId', getTicketSettings);
router.post('/', upsertTicketSettings);

export default router;
