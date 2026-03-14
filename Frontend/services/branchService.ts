import { API_URL } from '@/lib/api-config';

export const branchService = {
    async getAll(orgId: string) {
        try {
            let headers: any = {};
            if (typeof window === 'undefined') {
                const { cookies } = await import('next/headers');
                headers = { Cookie: (await cookies()).toString() };
            }
            const response = await fetch(`${API_URL}/branches/${orgId}`, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching branches", error);
            return [];
        }
    }
};
