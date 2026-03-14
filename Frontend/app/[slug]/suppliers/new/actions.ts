'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { supplierService } from '@/services/supplierService'

export async function createSupplierAction(orgId: string, slug: string, formData: FormData) {

    const name = formData.get('name') as string
    const contact = formData.get('contact') as string

    if (!name) return { error: "El nombre es obligatorio" }

    try {
        await supplierService.create({
            organization_id: orgId,
            name,
            contact_name: contact
            // Add other fields if form has them
        });

        // Actualizamos la nueva ruta de proveedores
        revalidatePath(`/${slug}/suppliers`)
        // Actualizamos también el formulario de compras por si se usa el select ahí
        revalidatePath(`/${slug}/purchases/new`)

    } catch (error) {
        console.error(error)
        return { error: 'Error al crear proveedor.' }
    }

    // Redirigimos a la lista nueva
    redirect(`/${slug}/suppliers`)
}