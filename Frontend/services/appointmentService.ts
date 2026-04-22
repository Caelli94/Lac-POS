const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const appointmentService = {
    getAll: async (orgId: string, from?: string, to?: string) => {
        const query = new URLSearchParams();
        if (from) query.append('from', from);
        if (to) query.append('to', to);

        const res = await fetch(`${API_URL}/appointments/${orgId}?${query.toString()}`, {
            credentials: 'include'
        });
        return await res.json();
    },

    create: async (data: any) => {
        const res = await fetch(`${API_URL}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return await res.json();
    },

    update: async (id: string, data: any) => {
        const res = await fetch(`${API_URL}/appointments/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        return await res.json();
    },

    delete: async (id: string) => {
        const res = await fetch(`${API_URL}/appointments/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        return await res.json();
    }
};
