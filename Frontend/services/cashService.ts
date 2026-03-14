// Tipos para no usar 'any'
export interface CreateMovementParams {
    organizationId: string;
    cashRegisterId: string;
    amount: number;
    type: 'SALE' | 'EXPENSE' | 'PAYMENT_RECEIVED' | 'WITHDRAWAL';
    description: string;
    userId: string;
    paymentMethod: string;
    referenceId?: string;
}

// Usaremos fetch directo al backend
import { API_URL } from '@/lib/api-config';

export const cashService = {
    // Registrar movimiento
    async registerMovement(data: CreateMovementParams) {
        const response = await fetch(`${API_URL}/cash/movements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error registering movement');
        }
        return await response.json();
    },

    // Obtener saldo (Simulado por ahora hasta tener el endpoint GET específico)
    async getCashStatus(cashRegisterId: string) {
        // Aquí idealmente llamarías a un endpoint GET.
        // Por ahora retornamos un mock para que la pantalla no falle.
        return { balance: 0, movements: [] };
    },

    async getRegistersByOrg(orgId: string) {
        let headers: any = {};
        if (typeof window === 'undefined') {
            const { cookies } = await import('next/headers');
            headers = { Cookie: (await cookies()).toString() };
        }
        const response = await fetch(`${API_URL}/cash/registers/org/${orgId}`, { cache: 'no-store', headers });
        if (!response.ok) return [];
        return await response.json();
    },

    async upsertRegister(data: any) {
        const response = await fetch(`${API_URL}/cash/registers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.message };
        }
        return { success: true, data: await response.json() };
    },

    async deleteRegister(id: string) {
        const response = await fetch(`${API_URL}/cash/registers/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            return { success: false, error: 'Error deleting register' };
        }
        return { success: true };
    },

    async getHistory(orgId: string, params: { from?: string, to?: string, includeOpen?: boolean }) {
        const query = new URLSearchParams();
        if (params.from) query.set('from', params.from);
        if (params.to) query.set('to', params.to);
        if (params.includeOpen) query.set('includeOpen', 'true');

        let headers: any = {};
        if (typeof window === 'undefined') {
            const { cookies } = await import('next/headers');
            headers = { Cookie: (await cookies()).toString() };
        }

        const response = await fetch(`${API_URL}/cash/org/${orgId}/history?${query.toString()}`, { cache: 'no-store', headers });
        if (!response.ok) return [];
        return await response.json();
    }
};