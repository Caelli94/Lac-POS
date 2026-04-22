// Eliminamos createClient de Supabase
// import { createClient } from '@supabase/supabase-js';

// Usaremos fetch directo al backend
import { API_URL } from '@/lib/api-config';

export const organizationService = {
    /**
     * Busca una organización por su SLUG (el texto en la URL).
     * @param slug El identificador amigable (ej: "mi-negocio")
     * @returns El objeto de la organización con su ID real.
     */
    async getBySlug(slug: string) {
        try {
            const response = await fetch(`${API_URL}/organizations/by-slug/${slug}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
                credentials: 'include'
            });

            if (!response.ok) {
                console.error(`[SERVER ERROR] Organización no encontrada (${slug}):`, response.status, response.statusText);
                return null;
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error de red buscando organización: ${slug}`, error);
            return null;
        }
    },

    async getAll() {
        try {
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

            const response = await fetch(`${API_URL}/organizations`, fetchOptions);

            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("Error fetching organizations", error);
            return [];
        }
    },

    async getById(id: string) {
        try {
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

            const response = await fetch(`${API_URL}/organizations/${id}`, fetchOptions);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error(`Error fetching organization ${id}`, error);
            return null;
        }
    },

    async toggleFeature(orgId: string, featureCode: string, isEnabled: boolean) {
        try {
            let headers: any = { 'Content-Type': 'application/json' };
            let fetchOptions: RequestInit = {
                method: 'POST',
                body: JSON.stringify({ featureCode, isEnabled }),
                cache: 'no-store'
            };

            if (typeof window === 'undefined') {
                const { cookies } = await import('next/headers');
                headers['Cookie'] = (await cookies()).toString();
            } else {
                fetchOptions.credentials = 'include';
            }
            fetchOptions.headers = headers;

            const response = await fetch(`${API_URL}/organizations/${orgId}/features`, fetchOptions);
            return response.ok;
        } catch (error) {
            console.error("Error toggling feature", error);
            return false;
        }
    },

    async update(id: string, data: any) {
        try {
            let headers: any = { 'Content-Type': 'application/json' };
            let fetchOptions: RequestInit = {
                method: 'PUT',
                body: JSON.stringify(data)
            };

            if (typeof window === 'undefined') {
                const { cookies } = await import('next/headers');
                headers['Cookie'] = (await cookies()).toString();
            } else {
                fetchOptions.credentials = 'include';
            }
            fetchOptions.headers = headers;

            const response = await fetch(`${API_URL}/organizations/${id}`, fetchOptions);
            return response.ok;
        } catch (error) {
            console.error("Error updating organization", error);
            return false;
        }
    },

    async getSuperAdminStats() {
        try {
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

            const response = await fetch(`${API_URL}/organizations/stats`, fetchOptions);

            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Error fetching stats", error);
            return null;
        }
    },

    async create(data: any) {
        try {
            let headers: any = { 'Content-Type': 'application/json' };
            let fetchOptions: RequestInit = {
                method: 'POST',
                body: JSON.stringify(data)
            };

            if (typeof window === 'undefined') {
                const { cookies } = await import('next/headers');
                headers['Cookie'] = (await cookies()).toString();
            } else {
                fetchOptions.credentials = 'include';
            }
            fetchOptions.headers = headers;

            const response = await fetch(`${API_URL}/organizations`, fetchOptions);
            if (!response.ok) {
                const err = await response.json();
                return { error: err.message || 'Error creating organization' };
            }
            const newOrg = await response.json();
            return { data: newOrg };
        } catch (error: any) {
            console.error("Error creating organization", error);
            return { error: error.message };
        }
    },

    async delete(id: string, password: string) {
        try {
            let headers: any = { 'Content-Type': 'application/json' };
            let fetchOptions: RequestInit = {
                method: 'DELETE',
                body: JSON.stringify({ password })
            };

            if (typeof window === 'undefined') {
                const { cookies } = await import('next/headers');
                headers['Cookie'] = (await cookies()).toString();
            } else {
                fetchOptions.credentials = 'include';
            }
            fetchOptions.headers = headers;

            const response = await fetch(`${API_URL}/organizations/${id}`, fetchOptions);

            if (!response.ok) {
                try {
                    const err = await response.json();
                    return { error: err.message || 'Error deleting organization' };
                } catch (e) {
                    return { error: response.statusText };
                }
            }

            return { success: true };
        } catch (error: any) {
            console.error("Error deleting organization", error);
            return { error: error.message };
        }
    }
};