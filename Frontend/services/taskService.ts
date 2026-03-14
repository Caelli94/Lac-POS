
import { API_URL } from '@/lib/api-config';

export const taskService = {
    async getTasks(orgId: string, start?: Date, end?: Date) {
        try {
            const queryParams = new URLSearchParams({ orgId });
            if (start) queryParams.append('start', start.toISOString());
            if (end) queryParams.append('end', end.toISOString());

            const response = await fetch(`${API_URL}/tasks?${queryParams}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Error fetching tasks', error);
            return [];
        }
    },

    async createTask(data: any) {
        try {
            const response = await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Error creating task');
            }
            return await response.json();
        } catch (error) {
            console.error('Error creating task', error);
            throw error;
        }
    },

    async updateTask(id: string, data: any) {
        try {
            const response = await fetch(`${API_URL}/tasks/${id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Error updating task');
            return await response.json();
        } catch (error) {
            console.error('Error updating task', error);
            throw error;
        }
    },

    async deleteTask(id: string) {
        try {
            const response = await fetch(`${API_URL}/tasks/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            return response.ok;
        } catch (error) {
            console.error('Error deleting task', error);
            throw error;
        }
    }
};
