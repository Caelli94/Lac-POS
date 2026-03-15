// En el servidor, NEXT_PUBLIC_API_URL podría estar mal seteado como '/api' localmente.
// Si no empieza con http, forzamos la ruta absoluta del backend local.
const serverSideUrl = process.env.NEXT_PUBLIC_API_URL?.startsWith('http')
    ? process.env.NEXT_PUBLIC_API_URL
    : (process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001/api');

export const API_URL = typeof window === 'undefined'
    ? serverSideUrl
    : '/api'; // Todo el frontend (navegador) rutea por acá para que funcione el NextJS Rewrite/Proxy.

export async function getHeaders() {
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof window === 'undefined') {
        try {
            const { cookies } = await import('next/headers');
            headers['Cookie'] = (await cookies()).toString();
        } catch (e) {
            // Ignore if called outside of request scope
        }
    }
    return headers;
}
