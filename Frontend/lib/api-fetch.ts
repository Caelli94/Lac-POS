// Wrapper de fetch que automáticamente agrega el Authorization Bearer token.
// Resuelve el problema de cookies cross-origin entre Vercel y Render.
// Mantiene credentials:'include' para compatibilidad con entornos de same-origin.

import { getAuthHeaders } from './auth-token';

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const authHeaders = getAuthHeaders();

    return fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            ...authHeaders,
            ...(options.headers as Record<string, string> || {}),
        },
    });
}
