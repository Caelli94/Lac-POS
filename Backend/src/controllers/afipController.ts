import { Request, Response } from 'express';
import { Organization } from '../models/Organization';
import { Sale } from '../models/Sale';
import { AfipService } from '../services/afipService';
import fs from 'fs';
import path from 'path';

export const AfipController = {
    /**
     * uploadCertificates:
     * Handles uploading of CRT and KEY files.
     */
    async uploadCertificates(req: Request, res: Response) {
        try {
            const { orgId } = req.params;
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            if (!files || (!files['cert'] && !files['key'])) {
                return res.status(400).json({ message: 'No se subieron archivos' });
            }

            const org = await Organization.findById(orgId);
            if (!org) return res.status(404).json({ message: 'Organización no encontrada' });

            // Initialize afip_settings if not present
            if (!org.afip_settings) {
                org.afip_settings = {
                    enabled: false,
                    mode: 'testing',
                    sales_point: 1
                };
            }

            // Save Paths
            if (files['cert']) {
                org.afip_settings.cert_path = files['cert'][0].path;
            }
            if (files['key']) {
                org.afip_settings.key_path = files['key'][0].path;
            }

            await org.save();
            res.json({ success: true, message: 'Certificados actualizados', data: org.afip_settings });

        } catch (error: any) {
            console.error(error);
            res.status(500).json({ message: 'Error al subir certificados', error: error.message });
        }
    },

    /**
     * updateSettings:
     * Updates AFIP configuration (Enabled, Mode, Sales Point, CUIT).
     */
    async updateSettings(req: Request, res: Response) {
        try {
            const { orgId } = req.params;
            const { enabled, mode, sales_point, cuit } = req.body;

            const org = await Organization.findById(orgId);
            if (!org) return res.status(404).json({ message: 'Not found' });

            if (!org.afip_settings) {
                org.afip_settings = {
                    enabled: false,
                    mode: 'testing'
                };
            }

            if (enabled !== undefined) org.afip_settings.enabled = enabled;
            if (mode) org.afip_settings.mode = mode;
            if (sales_point) org.afip_settings.sales_point = sales_point;
            if (cuit) org.afip_settings.cuit = cuit;

            // New Fields
            if (req.body.tax_condition) org.afip_settings.tax_condition = req.body.tax_condition;
            if (req.body.gross_income) org.afip_settings.gross_income = req.body.gross_income;
            if (req.body.start_activity_date) org.afip_settings.start_activity_date = req.body.start_activity_date;

            await org.save();
            res.json({ success: true, data: org.afip_settings });

        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    },

    /**
     * emitInvoice:
     * Triggers the invoice generation for a specific sale.
     */
    async emitInvoice(req: Request, res: Response) {
        try {
            const { saleId } = req.params;
            const sale = await Sale.findById(saleId);
            if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });

            if (sale.afip_data?.cae) {
                return res.status(400).json({ message: 'Esta venta ya fue facturada' });
            }

            const result = await AfipService.createInvoice(sale);

            // Update Sale
            sale.afip_data = {
                cae: result.cae,
                cae_expiration: new Date(result.cae_expiration), // Format usually YYYYMMDD? API returns string, converting to Date might need parsing if format is YYYYMMDD
                cbte_nro: result.cbte_nro,
                pto_vta: result.pto_vta,
                cbte_tipo: result.cbte_tipo
            };

            // Note: afip-apis usually returns date as YYYYMMDD string. 
            // Parsing "20240101" to Date:
            if (typeof result.cae_expiration === 'string' && result.cae_expiration.length === 8) {
                const y = parseInt(result.cae_expiration.substr(0, 4));
                const m = parseInt(result.cae_expiration.substr(4, 2)) - 1;
                const d = parseInt(result.cae_expiration.substr(6, 2));
                sale.afip_data.cae_expiration = new Date(y, m, d);
            }

            await sale.save();
            res.json({ success: true, data: sale });

        } catch (error: any) {
            res.status(500).json({ message: 'Error al facturar', error: error.message });
        }
    },

    /**
     * getServerStatus:
     */
    async getServerStatus(req: Request, res: Response) {
        try {
            const { orgId } = req.params;
            const status = await AfipService.getServerStatus(orgId);
            res.json({ success: true, status });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    },

    /**
     * generateCsr:
     * Generates and returns CSR file content.
     */
    async generateCsr(req: Request, res: Response) {
        try {
            const { orgId } = req.params;
            const result = await AfipService.generateCsr(orgId);

            // Send CSR and Key as text
            res.json({
                success: true,
                csr: result.csr,
                key: result.key,
                message: 'Claves generadas. Se descargarán ambos archivos (.csr y .key). Guárdalos bien.'
            });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
};
