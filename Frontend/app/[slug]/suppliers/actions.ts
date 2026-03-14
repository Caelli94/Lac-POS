'use server'

import { revalidatePath } from 'next/cache'
import { supplierService } from '@/services/supplierService'

export async function createSupplierAction(orgId: string, slug: string, formData: FormData) {
    const name = formData.get('name') as string

    // Check if 'data' JSON string exists (alternative approach)
    // but sticking to individual gets for consistency if possible, OR
    // parsing the special 'addresses' field.

    const contact_name = formData.get('contact_name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const tax_id = formData.get('tax_id') as string
    const instagram = formData.get('instagram') as string
    const tiktok = formData.get('tiktok') as string
    const web_url = formData.get('web_url') as string
    const image_url = formData.get('image_url') as string

    const addressesJson = formData.get('addresses') as string
    const addresses = addressesJson ? JSON.parse(addressesJson) : []

    const phonesJson = formData.get('phones') as string
    const phones = phonesJson ? JSON.parse(phonesJson) : []

    const emailsJson = formData.get('emails') as string
    const emails = emailsJson ? JSON.parse(emailsJson) : []

    const is_active_account = formData.get('is_active_account') === 'true';
    const credit_limit = parseFloat(formData.get('credit_limit') as string) || 0;

    const categoryIdsJson = formData.get('category_ids') as string
    const category_ids = categoryIdsJson ? JSON.parse(categoryIdsJson) : []

    const importConfigJson = formData.get('import_config') as string
    const import_config = importConfigJson ? JSON.parse(importConfigJson) : {}

    console.log("Creating Supplier:", { name, orgId, phones, addresses, emails });

    if (!name) return { error: "El nombre es obligatorio" }

    // Map primary phone and email for compatibility
    const primaryPhone = phones.length > 0 ? phones[0].number : (formData.get('phone') as string || '');
    const primaryEmail = emails.length > 0 ? emails[0].email : (formData.get('email') as string || '');

    const code = formData.get('code') as string

    try {
        await supplierService.create({
            organization_id: orgId,
            code,
            name,
            contact_name,
            email: primaryEmail,
            phone: primaryPhone,
            tax_id,
            instagram,
            tiktok,
            web_url,
            image_url,
            addresses,
            phones,
            emails,
            is_active_account,
            credit_limit,
            category_ids,
            import_config
        });

        revalidatePath(`/${slug}/suppliers`)
        return { success: true }
    } catch (error: any) {
        console.error("Create Supplier Error:", error);
        return { error: error.message || 'Error al crear proveedor.' }
    }
}

export async function updateSupplierAction(orgId: string, slug: string, id: string, data: any) {
    console.log("Updating Supplier:", { id, data }); // Debug Log
    try {
        await supplierService.update({
            id,
            organization_id: orgId,
            code: data.code,
            name: data.name,
            contact_name: data.contact_name,
            email: (data.emails && data.emails.length > 0) ? data.emails[0].email : data.email,
            phone: (data.phones && data.phones.length > 0) ? data.phones[0].number : data.phone,
            tax_id: data.tax_id,
            instagram: data.instagram,
            tiktok: data.tiktok,
            web_url: data.web_url,
            image_url: data.image_url,
            addresses: data.addresses,
            phones: data.phones,
            emails: data.emails,
            is_active_account: data.is_active_account,
            credit_limit: data.credit_limit,
            category_ids: data.category_ids,
            import_config: data.import_config
        });

        revalidatePath(`/${slug}/suppliers`)
        return { success: true }
    } catch (error: any) {
        return { error: error.message || 'Error al actualizar proveedor' }
    }
}

export async function deleteSupplierAction(orgId: string, slug: string, id: string) {
    try {
        await supplierService.delete(id);
        revalidatePath(`/${slug}/suppliers`)
        return { success: true }
    } catch (error) {
        return { error: 'Error al eliminar proveedor' }
    }
}

export async function deleteSuppliersAction(orgId: string, slug: string, ids: string[]) {
    try {
        await Promise.all(ids.map(id => supplierService.delete(id)));
        revalidatePath(`/${slug}/suppliers`)
        return { success: true }
    } catch (err: any) {
        return { error: 'Error al eliminar proveedores' }
    }
}

export async function voidSupplierAccountMovementAction(movementId: string, slug: string) {
    try {
        await supplierService.voidMovement(movementId);
        revalidatePath(`/${slug}/suppliers`)
        return { success: true }
    } catch (error: any) {
        console.error("Error voiding supplier movement action:", error);
        return { error: error.message || 'No se pudo anular el movimiento.' }
    }
}
