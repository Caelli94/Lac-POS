'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { API_URL } from '@/lib/api-config';


// Helper param obtener token
async function getAuthHeaders() {
    const cookieStore = await cookies();
    return {
        'Content-Type': 'application/json',
        'Cookie': cookieStore.toString()
    }
}

/**
 * ABRE EL TURNO
 */
export async function openCashRegister(orgId: string, registerId: string, openingBalance: number, slug: string, cashierName?: string, shiftName?: string, notes?: string) {
    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/cash/sessions/open`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                organizationId: orgId,
                cashRegisterId: registerId,
                openingBalance,
                userId: '66aaaaaa66aaaaaa66aaaaaa', // Backend should ignore this if token is present
                cashierName,
                shiftName,
                notes
            })
        });

        const data = await res.json();
        if (!res.ok) return { error: data.message || 'Error al abrir caja' };

        revalidatePath(`/${slug}/cash`);
        return { success: true, session: data };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * CIERRA EL TURNO
 */
export async function closeCashRegister(sessionId: string, registerId: string, closingBalance: number, notes?: string, slug?: string, cashierName?: string, shiftName?: string, orgId?: string) {
    try {
        const headers = await getAuthHeaders();
        // Add Org ID if needed for specific logic (optional)
        if (orgId) (headers as any)['x-organization-id'] = orgId;

        const url = `${API_URL}/cash/sessions/${sessionId}/close`;
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                closingBalance,
                notes,
                userId: '66aaaaaa66aaaaaa66aaaaaa',
                cashierName,
                shiftName
            })
        });

        const data = await res.json();
        if (!res.ok) return { error: data.message || 'Error al cerrar caja' };

        revalidatePath(`/${slug}/cash`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * REGISTRA MOVIMIENTOS MANUALES
 */
export async function registerCashMovement(orgId: string, registerId: string, sessionId: string, type: 'IN' | 'OUT', amount: number, description: string, paymentMethod: string, slug: string) {
    try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/cash/movements`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                organizationId: orgId,
                cashRegisterId: registerId,
                session: sessionId, // Pass explicit session ID
                amount,
                type: type === 'IN' ? 'IN' : 'EXPENSE', // Map to Backend Enum
                description,
                paymentMethod: paymentMethod || 'cash'
            })
        });

        const data = await res.json();

        if (!res.ok) return { error: data.message || 'Error al registrar movimiento' };

        revalidatePath(`/${slug}/cash`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

/**
 * OBTIENE DETALLE DE SESIÓN
 */
export async function getSessionDetails(sessionId: string) {
    try {
        const cookieStore = await cookies();
        const headers = { 'Cookie': cookieStore.toString() };

        const res = await fetch(`${API_URL}/cash/sessions/${sessionId}/details`, { cache: 'no-store', headers });
        const data = await res.json();
        if (!res.ok) return { sales: [], movements: [] };
        return data;
    } catch (e) {
        return { sales: [], movements: [] };
    }
}

/**
 * ANULA MOVIMIENTO MANUAL
 */
export async function voidCashMovement(movementId: string, slug: string) {
    try {
        const cookieStore = await cookies();
        const headers = { 'Cookie': cookieStore.toString() };

        const res = await fetch(`${API_URL}/cash/movements/${movementId}`, {
            method: 'DELETE',
            headers
        });

        const data = await res.json();
        if (!res.ok) return { error: data.message || 'Error al anular movimiento' };

        revalidatePath(`/${slug}/cash`);
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}