export const API_URL = typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001/api')
    : (process.env.NEXT_PUBLIC_API_URL || '/api');

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
