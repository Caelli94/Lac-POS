'use server'

import { revalidatePath } from 'next/cache'
import { customerService } from '@/services/customerService'

export async function createCustomerAction(orgId: string, slug: string, formData: FormData) {


    const name = formData.get('name')?.toString()

    if (!name) {
        return { error: 'El nombre es obligatorio' }
    }

    console.log("Creating customer", { orgId, name, slug });


    const newCustomer = {
        organization_id: orgId,
        code: formData.get('code')?.toString() || null,
        name: name,
        doc_type: formData.get('doc_type')?.toString() || null,
        doc_number: formData.get('doc_number')?.toString() || null,
        email: formData.get('email')?.toString() || null,
        phone: formData.get('phone')?.toString() || null,
        address: formData.get('address')?.toString() || null,
        city: formData.get('city')?.toString() || null,
        province: formData.get('province')?.toString() || null,
        image_url: formData.get('image_url')?.toString() || null,
        is_active: formData.get('is_account_active') === 'on',
        credit_limit: parseFloat(formData.get('credit_limit')?.toString() || '0'),
        surcharge_rate: parseFloat(formData.get('surcharge_rate')?.toString() || '0')
    }

    try {
        await customerService.create(newCustomer)
    } catch (error: any) {
        return { error: error.message || 'Error al crear cliente' }
    }

    // Handle Checking Account Status for new customers (if API returns the created object with ID)
    // The service returns boolean currently. We might need to refactor service to return the object 
    // or assume success and we don't have the ID immediately to update the account easily 
    // UNLESS we fetch it by name/email (risky) or rely on default being true.
    // OPTION B: modifying organizationService/customerService to return the data. 
    // Let's assume for now the user is ok with default "Active" for new ones, OR we update the service.

    // Actually, let's fix the service return type in a separate step if needed. 
    // For now, I will focus on UPDATE which has the ID.

    revalidatePath(`/${slug}/customers`)
    return { success: 'Cliente creado correctamente' }
}

export async function updateCustomerAction(orgId: string, slug: string, id: string, formData: FormData) {
    const name = formData.get('name')?.toString()
    const isAccountActive = formData.get('is_account_active') === 'on'

    if (!name) {
        return { error: 'El nombre es obligatorio' }
    }

    const customerData = {
        id: id,
        // organization_id: orgId, // Removing to avoid accidental overwrite/move
        code: formData.get('code')?.toString() || null,
        name: name,
        doc_type: formData.get('doc_type')?.toString() || null,
        doc_number: formData.get('doc_number')?.toString() || null,
        email: formData.get('email')?.toString() || null,
        phone: formData.get('phone')?.toString() || null,
        address: formData.get('address')?.toString() || null,
        city: formData.get('city')?.toString() || null,
        province: formData.get('province')?.toString() || null,
        image_url: formData.get('image_url')?.toString() || null,
        surcharge_rate: parseFloat(formData.get('surcharge_rate')?.toString() || '0'),
    }

    try {
        await customerService.update(customerData)
    } catch (error: any) {
        return { error: error.message || 'Error al actualizar cliente' }
    }

    // Update Account Status & Limit
    const creditLimit = parseFloat(formData.get('credit_limit')?.toString() || '0');

    await customerService.updateAccount(id, {
        is_active: isAccountActive,
        credit_limit: creditLimit
    })

    // We will use a dedicated helper for toggle that handles existing limit
    // But since we are in a server action, let's just accept we might need to fetch first.
    // Actually, simpler: CheckingAccountModal handles the limit. Here we just toggle active.
    // We should probably use the toggleCheckingAccount logic if we can.

    // Let's just do a targeted update for is_active. 
    // We need to modify the implementation of updateAccount in backend or frontend service to be safe.
    // Assuming backend `updateCustomerAccount` replaces values if provided.

    // WORKAROUND: For now, I will try to update just the status. 
    // If backend overwrites limit to undefined, that's bad.
    // Let's look at backend `updateCustomerAccount`:
    // const { is_active, credit_limit } = req.body;
    // account.is_active = is_active;
    // account.credit_limit = credit_limit; 
    // It DOES overwrite.

    // So I must fetch the account first to get the current limit.
    const account = await customerService.getAccount(id)
    if (account) {
        await customerService.updateAccount(id, {
            is_active: isAccountActive,
            credit_limit: account.credit_limit || 0
        })
    }

    revalidatePath(`/${slug}/customers`)
    return { success: 'Cliente actualizado correctamente' }
}

export async function deleteCustomerAction(orgId: string, slug: string, id: string) {
    const success = await customerService.delete(id)

    if (!success) {
        return { error: 'Error al eliminar cliente' }
    }

    revalidatePath(`/${slug}/customers`)
    return { success: 'Cliente eliminado correctamente' }
}

export async function deleteCustomersAction(orgId: string, slug: string, ids: string[]) {
    try {
        await Promise.all(ids.map(id => customerService.delete(id)));
        revalidatePath(`/${slug}/customers`)
        return { success: true }
    } catch (err: any) {
        return { error: 'Error al eliminar clientes' }
    }
}

export async function voidAccountMovementAction(movementId: string, slug: string) {
    try {
        await customerService.voidMovement(movementId);
        revalidatePath(`/${slug}/customers`)
        return { success: true }
    } catch (error: any) {
        console.error("Error voiding account movement action:", error);
        return { error: error.message || 'No se pudo anular el movimiento.' }
    }
}

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