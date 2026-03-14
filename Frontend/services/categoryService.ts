import { API_URL, getHeaders } from '@/lib/api-config';

export const categoryService = {
    async getAll(orgId: string) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/categories/${orgId}`, {
                cache: 'no-store',
                headers
            });
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching categories", error);
            return [];
        }
    },

    async create(data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/categories`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error creating category');
            }

            return await response.json();
        } catch (error) {
            console.error("Error creating category", error);
            throw error;
        }
    },

    async update(data: any) {
        try {
            const headers = await getHeaders();
            const response = await fetch(`${API_URL}/categories/${data.id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error updating category');
            }

            return await response.json();
        } catch (error) {
            console.error("Error updating category", error);
            throw error;
        }
    },

    async delete(id: string) {
        try {
            const headers = await getHeaders();
            await fetch(`${API_URL}/categories/${id}`, {
                method: 'DELETE',
                headers
            });
            return true;
        } catch (error) {
            return false;
        }
    }
};
