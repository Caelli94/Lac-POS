'use server'

import { revalidatePath } from 'next/cache'
import { purchasesService } from '@/services/purchasesService'

type PurchaseItem = {
    product_id: string;
    variant_id?: string | null;
    quantity: number;
    cost: number;
}

export async function registerPurchaseAction(
    orgId: string,
    slug: string,
    supplierId: string | null,
    branchId: string | null,
    total: number,
    items: PurchaseItem[],
    updateTimestamp: boolean = true
) {
    try {
        await purchasesService.create({
            organization_id: orgId,
            supplier_id: supplierId,
            branch_id: branchId,
            total_amount: total,
            items: items,
            update_timestamp: updateTimestamp
        });

        revalidatePath(`/${slug}/inventory`) // Actualizamos stock visualmente
        revalidatePath(`/${slug}/purchases`) // Actualizamos historial
        return { success: true }
    } catch (error: any) {
        console.error("Error registrando compra:", error)
        return { error: 'Error al registrar la compra.' }
    }
}