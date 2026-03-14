'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { organizationService } from '@/services/organizationService'

export async function createCompanyAction(formData: FormData) {
    const name = formData.get('name') as string
    const slug = formData.get('slug') as string
    const adminEmail = formData.get('adminEmail') as string

    // Validación básica de campos
    if (!name || !slug || !adminEmail) {
        return { error: 'Todos los campos son obligatorios' }
    }

    // Validación de formato de URL (Slug)
    // Solo permitimos letras minúsculas, números y guiones. No espacios.
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
        return { error: 'La URL no puede contener espacios ni caracteres especiales. Use solo letras minúsculas, números y guiones.' }
    }

    // Llamada al servicio que conecta con el Backend Express
    console.log("Creating company with:", { name, slug, adminEmail });
    const result = await organizationService.create({
        name,
        slug,
        adminEmail
    });

    if (result.error) {
        console.error('Error creando empresa:', result.error)
        return { error: result.error }
    }

    console.log("Create result:", result);

    // Si hay un link de configuración, lo devolvemos para mostrarlo en el cliente
    if (result.data?.setupLink) {
        console.log("Returning setup link:", result.data.setupLink);
        revalidatePath('/admin/companies')
        return { setupLink: result.data.setupLink }
    }

    // Si no hay link (legacy), redirigimos
    revalidatePath('/admin/companies')
    redirect('/admin/companies')
}