'use server'

import { revalidatePath } from 'next/cache'
import { salesService } from '@/services/salesService'

export async function cancelSaleAction(saleId: string, orgId: string, slug: string) {
    try {
        await salesService.cancel(saleId, orgId);

        revalidatePath(`/${slug}/cash`)
        revalidatePath(`/${slug}/pos`)
        revalidatePath(`/${slug}/sales`)

        return { success: true }
    } catch (error) {
        console.error("Error cancelling sale:", error);
        return { error: "No se pudo anular la venta." }
    }
}