'use server'

import { revalidatePath } from 'next/cache'
import { customerService } from '@/services/customerService'

export async function toggleCheckingAccount(
    customerId: string,
    orgId: string,
    isActive: boolean,
    creditLimit: number
) {
    try {
        const success = await customerService.updateAccount(customerId, {
            is_active: isActive,
            credit_limit: creditLimit
        });

        if (!success) {
            return { error: 'Error al actualizar la cuenta corriente' }
        }

        revalidatePath(`/`)
        return { success: true }
    } catch (error: any) {
        console.error("Error toggle account:", error)
        return { error: 'Error al actualizar la cuenta corriente' }
    }
}