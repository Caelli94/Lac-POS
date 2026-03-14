'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { API_URL } from '@/lib/api-config'

export async function register(formData: FormData) {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return { error: errorData.message || 'Error al registrar usuario' }
        }

        const data = await response.json();
        const token = data.token;

        // Auto-login: Guardar token
        const cookieStore = await cookies()
        cookieStore.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 días
            path: '/',
        })

    } catch (error) {
        console.error(error)
        return { error: 'Error de conexión con el servidor' }
    }

    redirect('/admin/dashboard')
}
