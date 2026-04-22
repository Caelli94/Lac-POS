import { API_URL } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-fetch';

export const checkService = {
    getAll: async (orgId: string, params: { type?: string, status?: string, search?: string, page?: number, limit?: number }) => {
        const query = new URLSearchParams();
        if (params.type) query.append('type', params.type);
        if (params.status) query.append('status', params.status);
        if (params.search) query.append('search', params.search);
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());

        const res = await apiFetch(`${API_URL}/checks/${orgId}?${query.toString()}`);
        return await res.json();
    },

    create: async (data: any) => {
        const res = await apiFetch(`${API_URL}/checks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    update: async (id: string, data: any) => {
        const res = await apiFetch(`${API_URL}/checks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    delete: async (id: string) => {
        const res = await apiFetch(`${API_URL}/checks/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    }
};
