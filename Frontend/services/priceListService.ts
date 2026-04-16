import { API_URL } from '@/lib/api-config';

export const priceListService = {
    async getAll(orgId: string, options?: { headers?: Record<string, string> }) {
        try {
            const response = await fetch(`${API_URL}/price-lists/${orgId}`, {
                cache: 'no-store',
                ...(options?.headers ? { headers: options.headers } : {})
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching price lists", error);
            return [];
        }
    }
};
