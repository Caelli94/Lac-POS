
import { cookies } from 'next/headers';
import { API_URL } from './api-config';

export async function getServerUser() {
    try {
        const cookieStore = await cookies();
        const cookieString = cookieStore.toString();

        const res = await fetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieString
            },
            cache: 'no-store'
        });

        if (!res.ok) {
            console.error("[getServerUser SSR Error] Status:", res.status, "Url:", `${API_URL}/auth/me`);
            return null;
        }
        const data = await res.json();
        // Omitimos logear DB gigante
        return data;
    } catch (error) {
        console.error("Error fetching server user", error);
        return null;
    }
}
