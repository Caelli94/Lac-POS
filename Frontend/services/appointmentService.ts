// IMPORTANTE: Usa API_URL desde api-config para pasar por el proxy de Next.js en Vercel.
// Esto resuelve el 401 cross-origin: browser → /api (proxy Vercel) → Render (con cookies).
import { API_URL, getHeaders } from '@/lib/api-config';
import { apiFetch } from '@/lib/api-fetch';

export const appointmentService = {
    getAll: async (orgId: string, from?: string, to?: string) => {
        const query = new URLSearchParams();
        if (from) query.append('from', from);
        if (to) query.append('to', to);

        const headers = await getHeaders();
        const res = await apiFetch(`${API_URL}/appointments/${orgId}${query.toString() ? `?${query.toString()}` : ''}`, {
            headers
        });
        return await res.json();
    },

    create: async (data: any) => {
        const headers = await getHeaders();
        const res = await apiFetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return await res.json();
    },

    update: async (id: string, data: any) => {
        const headers = await getHeaders();
        const res = await apiFetch(`${API_URL}/appointments/${id}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return await res.json();
    },

    delete: async (id: string) => {
        const headers = await getHeaders();
        const res = await apiFetch(`${API_URL}/appointments/${id}`, {
            method: 'DELETE',
            headers
        });
        return await res.json();
    }
};
