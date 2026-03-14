import { API_URL, getHeaders } from '@/lib/api-config';

export const stockLotService = {
    getAll: async (orgId: string, params: any = {}) => {
        const query = new URLSearchParams(params).toString();
        const headers = await getHeaders();
        const response = await fetch(`${API_URL}/stock-lots/${orgId}${query ? `?${query}` : ''}`, {
            headers,
            credentials: 'include'
        });
        return response.json();
    },
    delete: async (orgId: string, id: string) => {
        const headers = await getHeaders();
        const response = await fetch(`${API_URL}/stock-lots/${orgId}/${id}`, {
            method: 'DELETE',
            headers,
            credentials: 'include'
        });
        return response.json();
    },
    adjustStock: async (orgId: string, id: string, stock: number) => {
        const headers = await getHeaders();
        const response = await fetch(`${API_URL}/stock-lots/${orgId}/${id}/adjust`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ stock }),
            credentials: 'include'
        });
        return response.json();
    },
    create: async (orgId: string, data: any) => {
        const headers = await getHeaders();
        const response = await fetch(`${API_URL}/stock-lots/${orgId}`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return response.json();
    }
};
