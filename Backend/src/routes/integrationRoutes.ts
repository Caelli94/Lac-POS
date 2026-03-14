import { Router } from 'express';
import { handleMercadoPagoWebhook, handleTiendaNubeWebhook, handleWixWebhook } from '../controllers/WebhookController';

const router = Router();

// Webhooks (Public endpoints or validated via platform-specific headers/tokens)
router.post('/webhooks/mercadopago', handleMercadoPagoWebhook);
router.post('/webhooks/tiendanube/:orgId', handleTiendaNubeWebhook);
router.post('/webhooks/wix/:orgId', handleWixWebhook);

export default router;
