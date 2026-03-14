import { API_URL } from '@/lib/api-config';

export const afipService = {
    async uploadCertificates(orgId: string, formData: FormData) {
        try {
            const response = await fetch(`${API_URL}/afip/upload-cert/${orgId}`, {
                method: 'POST',
                body: formData // Content-Type header is handled automatically by browser for FormData
            });
            return await response.json();
        } catch (error) {
            return { success: false, message: 'Error de red' };
        }
    },

    async updateSettings(orgId: string, data: any) {
        try {
            const response = await fetch(`${API_URL}/afip/settings/${orgId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            return { success: false, message: 'Error de red' };
        }
    },

    async emitInvoice(saleId: string) {
        try {
            const response = await fetch(`${API_URL}/afip/invoice/${saleId}`, {
                method: 'POST'
            });
            const data = await response.json();
            if (!response.ok) return { success: false, message: data.message || 'Error al facturar' };
            return { success: true, data: data };
        } catch (error: any) {
            return { success: false, message: error.message || 'Error de red' };
        }
    },

    async getServerStatus(orgId: string) {
        try {
            const response = await fetch(`${API_URL}/afip/status/${orgId}`);
            return await response.json();
        } catch (error) {
            return { success: false, message: 'Error de red' };
        }
    },

    async generateCsr(orgId: string) {
        try {
            const response = await fetch(`${API_URL}/afip/generate-csr/${orgId}`, {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            return { success: false, message: 'Error de red' };
        }
    }
};
