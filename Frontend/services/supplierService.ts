import { API_URL, getHeaders } from '@/lib/api-config';

export const supplierService = {
    async getAll(orgId: string, params?: { page?: number; limit?: number; search?: string; debtFilter?: string; maturityDays?: number }) {
        try {
            const query = new URLSearchParams(params as any).toString();

            // SAFE MODE: If offline, don't even try to fetch
            if (typeof window !== 'undefined' && !navigator.onLine) {
                return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 }, offline: true };
            }

            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/suppliers/${orgId}?${query}`, {
                method: 'GET',
                headers,
                cache: 'no-store'
            });
            if (!response.ok) return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
            return await response.json();
        } catch (error) {
            console.error("Error fetching suppliers", error);
            return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
        }
    },

    async create(data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/suppliers`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data),
                cache: 'no-store'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error creating supplier');
            }

            return await response.json();
        } catch (error) {
            console.error("Error creating supplier", error);
            throw error;
        }
    },

    async update(data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/suppliers/${data.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(data),
                cache: 'no-store'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error updating supplier');
            }

            return await response.json();
        } catch (error) {
            console.error("Error updating supplier", error);
            throw error;
        }
    },

    async delete(id: string) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/suppliers/${id}`, {
                method: 'DELETE',
                headers,
                cache: 'no-store'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error deleting supplier');
            }

            return true;
        } catch (error) {
            console.error("Error deleting supplier", error);
            throw error;
        }
    },

    async getStatistics(orgId: string, params?: { from?: string, to?: string, limit?: number }) {
        try {
            const query = new URLSearchParams(params as any).toString();
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/suppliers/${orgId}/statistics?${query}`, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Error fetching supplier stats", error);
            return null;
        }
    },

    async voidMovement(movementId: string) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/suppliers/account/movements/${movementId}`, {
                method: 'DELETE',
                headers
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al anular movimiento');
            }
            return await response.json();
        } catch (error) {
            console.error("Error voiding account movement", error);
            throw error;
        }
    }
};
