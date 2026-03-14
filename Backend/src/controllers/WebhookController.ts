import { Request, Response } from 'express';
import { IntegrationService } from '../services/IntegrationService';

export const handleMercadoPagoWebhook = async (req: Request, res: Response) => {
    try {
        const { topic, id } = req.query;
        const orgId = req.headers['x-org-id'] as string; // Deberíamos obtenerlo de la URL o payload según config

        console.log(`[Webhook] Mercado Pago Notification received: ${topic} - ${id}`);

        // Topic 'payment' es el más común
        if (topic === 'payment') {
            // IntegrationService.handleMercadoPagoPayment(orgId, id);
        }

        res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('[Webhook] Error processing MP Notification:', error.message);
        res.status(500).json({ error: error.message });
    }
};

export const handleTiendaNubeWebhook = async (req: Request, res: Response) => {
    try {
        const orgId = req.params.orgId;
        const payload = req.body;

        console.log(`[Webhook] Tienda Nube Notification received for org: ${orgId}`);
        await IntegrationService.handleExternalSale('tiendanube', payload, orgId);

        res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('[Webhook] Error processing Tienda Nube Notification:', error.message);
        res.status(500).json({ error: error.message });
    }
};

export const handleWixWebhook = async (req: Request, res: Response) => {
    try {
        const orgId = req.params.orgId;
        const payload = req.body;

        console.log(`[Webhook] Wix Notification received for org: ${orgId}`);
        await IntegrationService.handleExternalSale('wix', payload, orgId);

        res.status(200).json({ received: true });
    } catch (error: any) {
        console.error('[Webhook] Error processing Wix Notification:', error.message);
        res.status(500).json({ error: error.message });
    }
};
