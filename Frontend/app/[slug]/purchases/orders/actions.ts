'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { API_URL, getHeaders } from '@/lib/api-config'

export async function createOrderAction(data: any, slug: string) {
    try {
        const headers = await getHeaders();
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al crear pedido');
        }

        revalidatePath(`/${slug}/purchases`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateOrderAction(id: string, data: any, slug: string) {
    try {
        const headers = await getHeaders();
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al actualizar pedido');
        }

        revalidatePath(`/${slug}/purchases`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteOrderAction(id: string, slug: string) {
    try {
        const headers = await getHeaders();
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'DELETE',
            headers
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Error al eliminar pedido');
        }

        revalidatePath(`/${slug}/purchases`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function searchCustomersAction(orgId: string, query: string) {
    try {
        const headers = await getHeaders();
        const res = await fetch(`${API_URL}/customers/${orgId}?search=${encodeURIComponent(query)}&limit=20`, {
            headers,
            cache: 'no-store'
        });

        if (!res.ok) return { success: false, customers: [] };

        const data = await res.json();
        // Handle both array and paginated response
        const customers = Array.isArray(data) ? data : (data.data || []);

        return { success: true, customers };
    } catch (error) {
        return { success: false, customers: [] };
    }
}
