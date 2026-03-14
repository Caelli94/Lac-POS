import { API_URL } from '@/lib/api-config';

export interface IPermission {
    module: string;
    view: boolean;
    edit: boolean;
    delete: boolean;
    tabs?: {
        name: string;
        enabled: boolean;
    }[];
}

export interface IRole {
    _id?: string;
    name: string;
    organization: string;
    permissions: IPermission[];
    isSystem?: boolean;
    allowSuperAdmin?: boolean;
}

export const roleService = {
    getRoles: async (orgId: string): Promise<IRole[]> => {
        let headers: any = { 'Content-Type': 'application/json' };
        let fetchOptions: RequestInit = {
            method: 'GET',
            cache: 'no-store'
        };

        if (typeof window === 'undefined') {
            const { cookies } = await import('next/headers');
            headers['Cookie'] = (await cookies()).toString();
        } else {
            fetchOptions.credentials = 'include';
        }
        fetchOptions.headers = headers;

        const res = await fetch(`${API_URL}/roles/${orgId}`, fetchOptions);
        if (!res.ok) throw new Error('Failed to fetch roles');
        return res.json();
    },

    createRole: async (roleData: Partial<IRole>): Promise<IRole> => {
        const res = await fetch(`${API_URL}/roles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(roleData)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to create role');
        return json;
    },

    updateRole: async (id: string, roleData: Partial<IRole>): Promise<IRole> => {
        const res = await fetch(`${API_URL}/roles/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(roleData)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to update role');
        return json;
    },

    deleteRole: async (id: string): Promise<void> => {
        const res = await fetch(`${API_URL}/roles/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) {
            const json = await res.json();
            throw new Error(json.message || 'Failed to delete role');
        }
    },

    seedRoles: async (organizationId: string): Promise<void> => {
        const res = await fetch(`${API_URL}/roles/seed/${organizationId}`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!res.ok) {
            const json = await res.json();
            throw new Error(json.message || 'Failed to seed roles');
        }
    }
};
