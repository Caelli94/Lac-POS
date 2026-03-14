// @ts-ignore
const Afip = require('afip-apis');
// @ts-ignore
const forge = require('node-forge');

import { Organization } from '../models/Organization';
import { ISale } from '../models/Sale';
import fs from 'fs';
import path from 'path';

const log = (msg: string, data?: any) => console.log(`[AfipService] ${msg}`, data || '');

const URLS = {
    production: {
        wsaa: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
        wsfe: "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL"
    },
    testing: {
        wsaa: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
        wsfe: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"
    }
};

const TICKET_PATH = path.join(__dirname, '../../uploads/afip_ticket.json');

// ==========================================================
// CACHE SYSTEM (FILE PERSISTENCE)
// ==========================================================

export const AfipService = {

    /**
     * getWsaaTicket:
     * Obtains the Ticket of Access (Token & Sign) from AFIP WSAA.
     * Uses FILE PERSISTENCE to survive restarts and avoid "alreadyAuthenticated".
     */
    async getWsaaTicket(org: any) {
        const production = org.afip_settings.mode === 'production';
        const urls = production ? URLS.production : URLS.testing;
        const currentCuit = parseInt(org.afip_settings.cuit.replace(/\D/g, ''));

        // 1. Try to Load from Disk
        if (fs.existsSync(TICKET_PATH)) {
            try {
                const cachedData = JSON.parse(fs.readFileSync(TICKET_PATH, 'utf-8'));
                // Check validity: same CUIT, same Mode, and not expired
                if (cachedData.cuit === currentCuit &&
                    cachedData.production === production &&
                    new Date(cachedData.expiration).getTime() > Date.now()) {

                    log('Using Ticket from Disk (Valid).');
                    return {
                        token: cachedData.token,
                        sign: cachedData.sign,
                        cuit: cachedData.cuit
                    };
                } else {
                    log('Ticket on Disk is expired or invalid. Requesting new one.');
                }
            } catch (err) {
                console.error('Error reading ticket file, ignoring.', err);
            }
        }

        log(`Getting New WSAA Ticket... Mode: ${production ? 'PROD' : 'TEST'}`);

        // Validate Certs
        if (!org.afip_settings.cert_path || !org.afip_settings.key_path) {
            throw new Error('Faltan certificados configurados');
        }
        if (!fs.existsSync(org.afip_settings.cert_path)) throw new Error('Certificado (.crt) no encontrado en disco');
        if (!fs.existsSync(org.afip_settings.key_path)) throw new Error('Clave privada (.key) no encontrada en disco');

        const loginTicket = new Afip.LoginTicket();

        try {
            // wsaaLogin(service, url, certPath, keyPath, durationMinutes)
            const ticketResponse = await loginTicket.wsaaLogin(
                "wsfe",
                urls.wsaa,
                org.afip_settings.cert_path,
                org.afip_settings.key_path,
                12 * 60 // 12 hours
            );

            log(`Using Cert: ${org.afip_settings.cert_path}`);
            log(`Using Key: ${org.afip_settings.key_path}`);

            log('New WSAA Ticket Received form AFIP.');

            let creds = ticketResponse.credentials;
            if (!creds && ticketResponse.loginTicketResponse) {
                creds = ticketResponse.loginTicketResponse.credentials;
            }

            if (!creds || !creds.token || !creds.sign) {
                throw new Error('Estructura de Ticket inválida recibida de AFIP');
            }

            // 3. Save to Disk
            const cacheData = {
                token: creds.token,
                sign: creds.sign,
                cuit: currentCuit,
                production: production,
                expiration: new Date(Date.now() + (10 * 60 * 60 * 1000)).toISOString() // 10 hours safe margin
            };

            // Ensure directory exists
            const dir = path.dirname(TICKET_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            fs.writeFileSync(TICKET_PATH, JSON.stringify(cacheData, null, 2));
            log('WSAA Ticket Saved to Disk.');

            return {
                token: creds.token,
                sign: creds.sign,
                cuit: currentCuit
            };

        } catch (e: any) {
            console.error('[AfipService] WSAA Login Failed:', e);

            if (e.message && e.message.includes('alreadyAuthenticated')) {
                throw new Error(`AFIP informa que ya existe una sesión activa. Al reiniciar el servidor perdimos la anterior. Por favor espera unos minutos antes de reintentar.`);
            }

            throw new Error(`Error de Autenticación con AFIP: ${e.message}`);
        }
    },

    /**
     * getWsfeInstance:
     * Returns an initialized Wsfev1 service instance.
     */
    async getWsfeInstance(org: any) {
        const production = org.afip_settings.mode === 'production';
        const urls = production ? URLS.production : URLS.testing;
        return new Afip.Wsfev1(urls.wsfe);
    },

    /**
     * getLastVoucher:
     * Calls FECompUltimoAutorizado
     */
    async getLastVoucher(wsfe: any, auth: any, salesPoint: number, type: number) {
        const payload = {
            Auth: {
                Token: auth.token,
                Sign: auth.sign,
                Cuit: auth.cuit
            },
            PtoVta: salesPoint,
            CbteTipo: type
        };

        log(`Getting Last Voucher: Pto=${salesPoint}, Tipo=${type}`);
        const result = await wsfe.FECompUltimoAutorizado(payload);

        if (result?.FECompUltimoAutorizadoResult?.Errors) {
            console.error('[AfipService] LastVoucher Errors:', JSON.stringify(result.FECompUltimoAutorizadoResult.Errors));
            throw new Error('Error buscando último comprobante');
        }

        const cbteNro = result?.FECompUltimoAutorizadoResult?.CbteNro;
        return cbteNro ? parseInt(cbteNro) : 0;
    },

    /**
     * createInvoice:
     * Orchestrates the invoicing process.
     */
    async createInvoice(sale: ISale) {
        try {
            const org = await Organization.findById(sale.organization_id);
            if (!org) throw new Error('Organización no encontrada');
            if (!org.afip_settings?.enabled) throw new Error('Facturación desactivada');

            const auth = await this.getWsaaTicket(org);
            const wsfe = await this.getWsfeInstance(org);

            const salesPoint = org.afip_settings.sales_point || 1;

            let cbteTipo = 11; // Factura C (Monotributo default)
            if (sale.invoice_letter === 'A') cbteTipo = 1;
            if (sale.invoice_letter === 'B') cbteTipo = 6;

            const lastVoucher = await this.getLastVoucher(wsfe, auth, salesPoint, cbteTipo);
            const nextVoucher = lastVoucher + 1;

            log(`Next Voucher: ${nextVoucher}`);

            const date = new Date();
            const formattedDate = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

            // Determine Receiver Condition (RG 5616)
            let condicionIva = 5; // Consumidor Final (Default)

            if (sale.invoice_letter === 'A') {
                condicionIva = 1; // IVA Responsable Inscripto
            } else if (sale.invoice_letter === 'B') {
                // If it has CUIT, it could be Monotributo (6) or Exento (4) or Consumidor Final (5)
                // For simplicity in this iteration, if no specific data, we assume:
                // If it is 'B' and has CUIT, it's likely Monotributo or Exento. 
                // However, 'B' is also for Consumidor Final.
                if (sale.fiscal_data?.cuit) {
                    condicionIva = 6; // Responsable Monotributo (Standard guess for B with CUIT)
                    // TODO: This should ideally come from sale.fiscal_data.tax_condition mapping
                } else {
                    condicionIva = 5; // Consumidor Final
                }
            } else if (sale.invoice_letter === 'C') {
                if (sale.fiscal_data?.cuit) {
                    condicionIva = 6; // Monotributo receiving C
                } else {
                    condicionIva = 5; // Consumidor Final receiving C
                }
            }

            // Fetch Items if not present (critical for tax calculation)
            // We need to look up SaleItems for this sale
            // @ts-ignore
            const { SaleItem } = require('../models/Sale');

            // If sale object doesn't have items populated, fetch them
            let items = (sale as any).sale_items || (sale as any).items;
            if (!items || items.length === 0) {
                log('Fetching items for sale...');
                items = await SaleItem.find({ sale_id: sale._id });
            }

            // Calculate Amounts
            let impNeto = 0;
            let impIVA = 0;
            let impTotal = 0;
            let ivaList: any[] = [];

            // Map Tax Rates to AFIP Codes
            // 21% -> 5
            // 10.5% -> 4
            // 27% -> 6
            // 5% -> 8
            // 2.5% -> 9
            // 0% -> 3
            const taxMap: Record<number, number> = {
                21: 5,
                10.5: 4,
                27: 6,
                5: 8,
                2.5: 9,
                0: 3
            };

            if (cbteTipo === 1 || cbteTipo === 6) { // Factura A or B
                // Group by Tax Rate
                const taxGroups: Record<number, { net: number, vat: number }> = {};

                for (const item of items) {
                    const rate = item.tax_rate ?? 21.0;
                    const totalItem = item.total_price; // This includes VAT in our system usually (Price is Final)

                    // Net = Total / (1 + rate/100)
                    const netItem = totalItem / (1 + (rate / 100));
                    const vatItem = totalItem - netItem;

                    if (!taxGroups[rate]) {
                        taxGroups[rate] = { net: 0, vat: 0 };
                    }
                    taxGroups[rate].net += netItem;
                    taxGroups[rate].vat += vatItem;
                }

                // Construct IVA Array
                for (const [rateStr, amounts] of Object.entries(taxGroups)) {
                    const rate = parseFloat(rateStr);
                    const afipCode = taxMap[rate] || 5; // Default to 21% if unknown

                    if (amounts.net > 0) {
                        ivaList.push({
                            Id: afipCode,
                            BaseImp: parseFloat(amounts.net.toFixed(2)),
                            Importe: parseFloat(amounts.vat.toFixed(2))
                        });

                        impNeto += amounts.net;
                        impIVA += amounts.vat;
                    }
                }

                // Final Rounding for Header
                impNeto = parseFloat(impNeto.toFixed(2));
                impIVA = parseFloat(impIVA.toFixed(2));

                // Recalculate Total to ensure consistency (Net + VAT)
                // This avoids "Total doesn't match sum" error from AFIP
                impTotal = parseFloat((impNeto + impIVA).toFixed(2));

                // Log for debugging
                log(`Tax Calc - Net: ${impNeto}, VAT: ${impIVA}, Total: ${impTotal} (Original: ${sale.total_amount})`);

            } else {
                // Factura C (implied) or others: Net = Total, IVA = 0
                impNeto = sale.total_amount;
                impIVA = 0;
                impTotal = sale.total_amount;
            }

            const payload = {
                Auth: {
                    Token: auth.token,
                    Sign: auth.sign,
                    Cuit: auth.cuit
                },
                FeCAEReq: {
                    FeCabReq: {
                        CantReg: 1,
                        PtoVta: salesPoint,
                        CbteTipo: cbteTipo
                    },
                    FeDetReq: {
                        FECAEDetRequest: {
                            Concepto: 1, // 1: Productos
                            DocTipo: sale.fiscal_data?.cuit ? 80 : 99,
                            DocNro: sale.fiscal_data?.cuit ? parseInt(sale.fiscal_data.cuit.replace(/\D/g, '')) : 0,
                            CbteDesde: nextVoucher,
                            CbteHasta: nextVoucher,
                            CbteFch: formattedDate,
                            ImpTotal: (cbteTipo === 1 || cbteTipo === 6) ? impTotal : sale.total_amount,
                            ImpTotConc: 0,
                            ImpNeto: impNeto,
                            ImpOpEx: 0,
                            ImpIVA: impIVA,
                            ImpTrib: 0,
                            MonId: 'PES',
                            MonCotiz: 1,
                            CondicionIVAReceptorId: condicionIva,
                            Iva: (cbteTipo === 1 || cbteTipo === 6) ? { AlicIva: ivaList } : undefined
                        }
                    }
                }
            };

            log('Sending FECAESolicitar...', payload);
            const response = await wsfe.FECAESolicitar(payload);
            log('FECAESolicitar Response Body:', JSON.stringify(response));

            const resultBody = response?.FECAESolicitarResult;

            if (resultBody?.FeCabResp?.Resultado === 'R') {
                const obs = resultBody?.FeDetResp?.FECAEDetResponse?.Observaciones ||
                    resultBody?.Errors;
                throw new Error('AFIP Rechazó: ' + JSON.stringify(obs));
            }

            if (resultBody?.FeCabResp?.Resultado === 'A') {
                const detResponse = resultBody.FeDetResp.FECAEDetResponse;
                const caeData = Array.isArray(detResponse) ? detResponse[0] : detResponse;

                return {
                    cae: caeData.CAE,
                    cae_expiration: caeData.CAEFchVto,
                    cbte_nro: nextVoucher,
                    pto_vta: salesPoint,
                    cbte_tipo: cbteTipo
                };
            }

            throw new Error('Respuesta inesperada de AFIP');

        } catch (e: any) {
            console.error('[AfipService] CreateInvoice Critical Error:', e);
            throw new Error(e.message || 'Error desconocido al facturar');
        }
    },

    /**
     * getServerStatus:
     * Used by the Frontend "Check Status" button.
     */
    async getServerStatus(orgId: string) {
        try {
            const org = await Organization.findById(orgId);
            if (!org) throw new Error('Org not found');

            log('Checking Server Status...');

            const auth = await this.getWsaaTicket(org);

            const wsfe = await this.getWsfeInstance(org);
            const status = await wsfe.FEDummy();

            log('FEDummy Response:', status);

            return {
                status: 'ONLINE',
                wsaa: 'OK',
                wsfe: status?.FEDummyResult?.AppServer || 'Unknown',
                auth: {
                    token_preview: auth.token.substring(0, 5) + '...'
                }
            };
        } catch (e: any) {
            console.error('[AfipService] getServerStatus Error:', e);
            throw e; // Controller sends 500
        }
    },

    /**
     * generateCsr:
     * Generates a new Private Key and CSR for the organization.
     */
    async generateCsr(orgId: string) {
        try {
            const org = await Organization.findById(orgId);
            if (!org) throw new Error('Organización no encontrada');

            const cuit = org.afip_settings?.cuit || '20000000000';
            const cn = `Testing`;

            log(`Generating CSR for CUIT: ${cuit}`);

            // 1. Generate Keys
            const keys = forge.pki.rsa.generateKeyPair(2048);

            // 2. Create CSR
            const csr = forge.pki.createCertificationRequest();
            csr.publicKey = keys.publicKey;
            csr.setSubject([
                { name: 'commonName', value: cn },
                { name: 'countryName', value: 'AR' },
                { name: 'organizationName', value: org.name || 'Empresa' },
                { name: 'serialNumber', value: `CUIT ${cuit}` }
            ]);

            csr.sign(keys.privateKey, forge.md.sha256.create());

            const pemCsr = forge.pki.certificationRequestToPem(csr);
            const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

            // 3. Save Private Key
            const uploadDir = path.join(__dirname, '../../uploads/certs');
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

            // Use orgId subdomain or unique name
            const keyFilename = `private_${orgId}_${Date.now()}.key`;
            const keyPath = path.join(uploadDir, keyFilename);

            fs.writeFileSync(keyPath, pemKey);

            // DO NOT Update Org Settings automatically. 
            // The user must upload the key manually to activate it.
            // This prevents breaking the current "Online" status while generating a new request.
            /* 
            if (!org.afip_settings) org.afip_settings = { enabled: false, mode: 'testing' };
            org.afip_settings.key_path = keyPath;
            await org.save();
            */

            return {
                csr: pemCsr,
                key: pemKey, // Return the key content so user can download it
                keyPath: keyPath
            };

        } catch (e: any) {
            console.error('[AfipService] CSR Generation Error:', e);
            throw new Error('Error generando solicitud de certificado');
        }
    }
};
