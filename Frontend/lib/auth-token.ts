// Utility para gestionar el JWT token en localStorage.
// Necesario para autenticación cross-origin (Vercel → Render)
// porque Chrome bloquea cookies third-party por defecto.

const TOKEN_KEY = 'lac_pos_auth_token';

export const saveAuthToken = (token: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
    }
};

export const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(TOKEN_KEY);
    }
    return null;
};

export const clearAuthToken = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
    }
};

// Devuelve el header Authorization si hay token guardado
export const getAuthHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};
