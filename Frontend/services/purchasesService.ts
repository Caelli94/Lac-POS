import { API_URL, getHeaders } from '@/lib/api-config';

export const purchasesService = {
    async getAll(orgId: string) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/purchases/${orgId}`, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching purchases", error);
            return [];
        }
    },

    async create(data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/purchases`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error creating purchase');
            }

            return await response.json();
        } catch (error) {
            console.error("Error creating purchase", error);
            throw error;
        }
    }
};
