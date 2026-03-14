import { API_URL } from '@/lib/api-config';

export const teamService = {
    // Get all members of an organization
    getTeam: async (organizationId: string) => {
        const res = await fetch(`${API_URL}/team/${organizationId}`, {
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch team');
        return res.json();
    },

    // Add a new member
    addMember: async (data: any) => {
        const res = await fetch(`${API_URL}/team`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to add member');
        return json;
    },

    // Update a member
    updateMember: async (id: string, data: any) => {
        const res = await fetch(`${API_URL}/team/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to update member');
        return json;
    },

    // Remove a member
    removeMember: async (userId: string) => {
        const res = await fetch(`${API_URL}/team/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to remove member');
        return res.json();
    }
};
