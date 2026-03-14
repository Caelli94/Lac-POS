import { API_URL, getHeaders } from '@/lib/api-config';

export const customerService = {
    async getAll(orgId: string, params?: { page?: number; limit?: number; search?: string; debtFilter?: string; maturityDays?: number }) {
        try {
            const query = new URLSearchParams(params as any).toString();

            // SAFE MODE: If offline, don't even try to fetch
            if (typeof window !== 'undefined' && !navigator.onLine) {
                return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 }, offline: true };
            }

            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/customers/${orgId}?${query}`, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
            return await response.json();
        } catch (error) {
            console.error("Error fetching customers", error);
            return { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
        }
    },

    async getById(id: string) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/customers/detail/${id}`, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            return null;
        }
    },

    async create(data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/customers`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear cliente');
            }

            return await response.json();
        } catch (error) {
            console.error("Error creating customer", error);
            throw error;
        }
    },

    async update(data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/customers/${data.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al actualizar cliente');
            }

            return await response.json();
        } catch (error) {
            console.error("Error updating customer", error);
            throw error;
        }
    },

    async delete(id: string) {
        try {
            const headers = await getHeaders();
            await fetch(`${API_URL}/customers/${id}`, {
                method: 'DELETE',
                headers
            });
            return true;
        } catch (error) {
            return false;
        }
    },

    async getAccount(id: string) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/customers/${id}/account`, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            return null;
        }
    },

    async updateAccount(id: string, data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/customers/${id}/account`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    },

    async getStatistics(orgId: string, params?: { from?: string, to?: string, limit?: number }) {
        try {
            const query = new URLSearchParams(params as any).toString();
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/customers/${orgId}/statistics?${query}`, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Error fetching customer stats", error);
            return null;
        }
    },

    async voidMovement(movementId: string) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/customers/account/movements/${movementId}`, {
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
    },

};
