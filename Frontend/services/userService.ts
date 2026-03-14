import { API_URL } from '@/lib/api-config';

export const userService = {
    /**
     * Actualiza los ajustes (settings) del usuario actual.
     * @param settings Objeto con las configuraciones (ej: { theme: { ... } })
     */
    async updateSettings(settings: any) {
        try {
            let headers: any = { 'Content-Type': 'application/json' };
            let fetchOptions: RequestInit = {
                method: 'PUT',
                body: JSON.stringify(settings)
            };

            if (typeof window === 'undefined') {
                const { cookies } = await import('next/headers');
                headers['Cookie'] = (await cookies()).toString();
            } else {
                fetchOptions.credentials = 'include';
            }
            fetchOptions.headers = headers;

            const response = await fetch(`${API_URL}/auth/settings`, fetchOptions);

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Error updating settings');
            }

            return await response.json();
        } catch (error) {
            console.error("Error updating user settings", error);
            return null;
        }
    }
};
