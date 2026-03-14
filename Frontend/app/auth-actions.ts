'use server';

import { cookies } from 'next/headers';

export async function logoutAction() {
    const cookieStore = await cookies();

    // Lista de cookies comunes que podrían estar manteniendo la sesión
    const cookiesToClear = ['token', 'session', 'user_id', 'org_id'];

    cookiesToClear.forEach(name => {
        cookieStore.delete(name);
    });

    return { success: true };
}
