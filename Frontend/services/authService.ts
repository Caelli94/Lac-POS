import { API_URL } from '@/lib/api-config';

export const authService = {
    async login(data: any) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include' // Important for Cookie
        });

        const json = await res.json();

        if (!res.ok) {
            throw new Error(json.message || 'Error al iniciar sesión');
        }

        return json;
    },

    async logout() {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    },

    async getMe() {
        if (typeof window !== 'undefined' && !navigator.onLine) return null;

        const res = await fetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!res.ok) return null;
        return res.json();
    },

    // 2FA Methods
    async generate2FA() {
        const res = await fetch(`${API_URL}/auth/2fa/generate`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Error generando 2FA');
        return await res.json();
    },

    async verify2FA(token: string) {
        const res = await fetch(`${API_URL}/auth/2fa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Error verificando 2FA');
        return await res.json();
    },

    async disable2FA(password: string, token: string) {
        const res = await fetch(`${API_URL}/auth/2fa/disable`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, token }),
            credentials: 'include'
        });
        if (!res.ok) {
            const json = await res.json();
            throw new Error(json.message || 'Error desactivando 2FA');
        }
        return await res.json();
    },

    async validate2FALogin(tempToken: string, token: string, recoveryCode?: string) {
        const res = await fetch(`${API_URL}/auth/2fa/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tempToken, token, recoveryCode }),
            credentials: 'include'
        });
        if (!res.ok) {
            const json = await res.json();
            throw new Error(json.message || 'Error validando 2FA');
        }
        return await res.json();
    }
};
