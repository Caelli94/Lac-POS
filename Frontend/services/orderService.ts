import { API_URL, getHeaders } from '@/lib/api-config';

export const orderService = {
    getAll: async (orgId: string) => {
        try {
            const headers = await getHeaders();
            const res = await fetch(`${API_URL}/orders/${orgId}`, {
                headers,
                cache: 'no-store'
            });
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error("Error fetching orders", error);
            try {
                if (error instanceof Error) {
                    console.error("Error details:", error.message);
                }
            } catch (e) { }
            return [];
        }
    }
};
