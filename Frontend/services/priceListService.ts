import { API_URL } from '@/lib/api-config';

export const priceListService = {
    async getAll(orgId: string) {
        try {
            const response = await fetch(`${API_URL}/price-lists/${orgId}`, {
                cache: 'no-store'
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching price lists", error);
            return [];
        }
    }
};
