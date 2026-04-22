import { API_URL } from '@/lib/api-config';

export const professionalService = {
    async getAll(orgId: string) {
        try {
            const response = await fetch(`${API_URL}/professionals/${orgId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            return await response.json();
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Error fetching professionals' };
        }
    },

    async create(data: any) {
        try {
            const response = await fetch(`${API_URL}/professionals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Error creating professional' };
        }
    },

    async update(id: string, data: any) {
        try {
            const response = await fetch(`${API_URL}/professionals/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Error updating professional' };
        }
    },

    async delete(id: string) {
        try {
            const response = await fetch(`${API_URL}/professionals/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            return await response.json();
        } catch (error) {
            console.error(error);
            return { success: false, message: 'Error deleting professional' };
        }
    }
};
