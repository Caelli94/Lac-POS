import { API_URL } from '@/lib/api-config';

export const importService = {
    importData: async (orgId: string, moduleCode: string, rows: any[], options?: any) => {
        try {
            let headers: any = { 'Content-Type': 'application/json' };
            let fetchOptions: RequestInit = {
                method: 'POST',
                body: JSON.stringify({
                    organization_id: orgId,
                    rows,
                    options
                }),
                cache: 'no-store'
            };

            if (typeof window === 'undefined') {
                // Server Side (Server Actions / SSR)
                const { cookies } = await import('next/headers');
                headers['Cookie'] = (await cookies()).toString();
            } else {
                // Client Side
                fetchOptions.credentials = 'include';
            }

            fetchOptions.headers = headers;

            const response = await fetch(`${API_URL}/import/${moduleCode}`, fetchOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error en la importación');
            }

            return data;
        } catch (error: any) {
            console.error("Import Service Error", error);
            throw error;
        }
    }
};
