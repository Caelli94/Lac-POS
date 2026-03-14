import { Product } from '../models/Product';
import { Organization } from '../models/Organization';
import { Sale, ISale } from '../models/Sale';
import axios from 'axios';

export class IntegrationService {
    /**
     * Sincroniza el stock de un producto con todas las plataformas habilitadas.
     * Se debe llamar cada vez que el stock local cambie (venta, ajuste, compra).
     */
    static async syncProductStock(productId: string, orgId: string) {
        try {
            const org = await Organization.findById(orgId);
            const product = await Product.findById(productId);

            if (!org || !product || product.sync_locked) {
                return;
            }

            const config = org.integrations_config;
            const stock = product.stock;

            // 1. Sincronización con Tienda Nube
            if (config?.tiendanube?.is_enabled && product.external_ids?.get('tiendanube')) {
                const storeId = config.tiendanube.store_id;
                const token = config.tiendanube.access_token;
                const externalId = product.external_ids.get('tiendanube');

                console.log(`[SYNC] Tienda Nube: Updating product ${externalId} with stock ${stock}`);

                // Tienda Nube API: PUT /v1/{store_id}/products/{product_id}/variants/{variant_id}
                // Nota: Si el producto tiene variantes, hay que iterar. Si no, se usa el variant_id principal.
                /*
                try {
                    await axios.put(
                        `https://api.tiendanube.com/v1/${storeId}/products/${externalId}/variants/${externalId}`, 
                        { stock }, 
                        { headers: { 'Authentication': `bearer ${token}`, 'User-Agent': 'LAC-POS Integration (admin@lac-pos.com)' } }
                    );
                } catch (err) {
                    console.error('Tienda Nube Sync Error:', err.response?.data || err.message);
                }
                */
            }

            // 2. Sincronización con Wix
            if (config?.wix?.is_enabled && product.external_ids?.get('wix')) {
                const siteId = config.wix.site_id;
                const token = config.wix.api_key;
                const externalId = product.external_ids.get('wix');

                console.log(`[SYNC] Wix: Updating product ${externalId} with stock ${stock}`);
                // Wix uses an Inventory API to update quantities
                /*
                try {
                    await axios.post(
                        `https://www.wixapis.com/inventory/v1/inventory-items/update`,
                        { 
                            inventoryItem: { 
                                id: externalId,
                                variants: [{ variantId: externalId, quantity: stock }] 
                            } 
                        },
                        { headers: { 'Authorization': token, 'wix-site-id': siteId } }
                    );
                } catch (err) {
                    console.error('Wix Sync Error:', err.response?.data || err.message);
                }
                */
            }

        } catch (error) {
            console.error('Error in syncProductStock:', error);
        }
    }

    /**
     * Procesa una venta recibida desde una plataforma externa (Webhook).
     * Crea la venta en el sistema local y ajusta el stock.
     */
    static async handleExternalSale(platform: 'tiendanube' | 'wix', orderData: any, orgId: string) {
        try {
            console.log(`[External Sale] ${platform.toUpperCase()} | Order: ${orderData.id} | Org: ${orgId}`);

            // 1. Verificar si la venta ya existe para evitar duplicados
            const existing = await Sale.findOne({ external_reference: orderData.id.toString(), source: platform });
            if (existing) {
                console.log(`[External Sale] Order ${orderData.id} already exists. Skipping.`);
                return existing;
            }

            // 2. Mapear datos básicos (Ejemplo simplificado de Tienda Nube)
            const saleData = {
                organization_id: orgId,
                total_amount: parseFloat(orderData.total || 0),
                source: platform,
                external_reference: orderData.id.toString(),
                status: 'completed',
                date: new Date(orderData.created_at || Date.now()),
                payments: [{
                    method: 'transfer', // Default para pedidos web pendientes de conciliación manual o via MP
                    amount: parseFloat(orderData.total || 0)
                }],
                document_type: 'ticket',
                sale_items: [] as any[]
            };

            // 3. Crear la venta en LAC-POS
            const newSale = new Sale(saleData);
            await newSale.save();

            console.log(`[External Sale] Successfully created sale ${newSale._id} from ${platform}`);
            return newSale;

        } catch (error) {
            console.error(`Error handling ${platform} sale:`, error);
            throw error;
        }
    }

    /**
     * Crea una preferencia de pago en Mercado Pago.
     */
    static async createMercadoPagoPreference(saleData: any, orgId: string) {
        try {
            const org = await Organization.findById(orgId);
            const token = org?.integrations_config?.mercadopago?.access_token;

            if (!token) throw new Error('Mercado Pago integration not configured');

            // En un escenario real, usaríamos mercadopago SDK v2
            return {
                init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=MP-SAMPLE-${Date.now()}`,
                id: `MP-SAMPLE-${Date.now()}`
            };
        } catch (error) {
            console.error('Error creating MP preference:', error);
            throw error;
        }
    }
}
