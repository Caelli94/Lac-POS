import { API_URL } from '@/lib/api-config';

export const salesService = {
    async getAll(orgId: string, from?: string, to?: string, page: number = 1, limit: number = 50) {
        try {
            const params = new URLSearchParams();
            if (from) params.append('from', from);
            if (to) params.append('to', to);
            params.append('page', page.toString());
            params.append('limit', limit.toString());

            const queryString = params.toString() ? `?${params.toString()}` : '';

            let headers: any = {};
            if (typeof window === 'undefined') {
                const { cookies } = await import('next/headers');
                headers = { Cookie: (await cookies()).toString() };
            }

            console.log(`[DEBUG] Fetching sales for ${orgId} with query: ${queryString}`);
            const response = await fetch(`${API_URL}/sales/${orgId}${queryString}`, {
                cache: 'no-store',
                headers
            });
            console.log(`[DEBUG] Sales response status: ${response.status}`);
            if (!response.ok) return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 1 } };
            return await response.json();
        } catch (error) {
            console.error("Error fetching sales", error);
            return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 1 } };
        }
    },

    async cancel(saleId: string, orgId: string) {
        try {
            let headers: any = { 'Content-Type': 'application/json' };

            // Inject cookies if server-side
            if (typeof window === 'undefined') {
                const { cookies } = await import('next/headers');
                const cookieStore = await cookies();
                const token = cookieStore.get('token');

                if (token) {
                    headers['Cookie'] = `token=${token.value}`;
                    // Also try Authorization header just in case backend supports it
                    headers['Authorization'] = `Bearer ${token.value}`;
                }
            }

            const response = await fetch(`${API_URL}/sales/${saleId}/cancel`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ orgId }),
                cache: 'no-store'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error cancelling sale');
            }
            return await response.json();
        } catch (error) {
            console.error("Error cancelling sale", error);
            throw error;
        }
    }
};
