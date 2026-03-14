'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { organizationService } from '@/services/organizationService'
import { settingsService } from '@/services/settingsService'

/**
 * updateSettingsAction:
 * Actualiza la información básica de la organización como dirección y contacto.
 */
export async function updateSettingsAction(orgId: string, slug: string, formData: FormData) {

    // TODO: Validar autenticación aquí si es necesario, por ahora confiamos en el middleware

    const updates: any = {
        address: formData.get('address')?.toString() || null,
        phone: formData.get('phone')?.toString() || null,
        tax_id: formData.get('tax_id')?.toString() || null,
        email_contact: formData.get('email_contact')?.toString() || null,
    }

    const disabledTabsRaw = formData.get('disabled_tabs');
    if (disabledTabsRaw) {
        try {
            const disabledTabs = JSON.parse(disabledTabsRaw.toString());
            // Use dot notation to update ONLY this field in Mongoose
            updates['settings.disabled_tabs'] = disabledTabs;
        } catch (e) {
            console.error("Error parsing disabled_tabs", e);
        }
    }

    const success = await organizationService.update(orgId, updates);

    if (!success) return { error: 'No se pudieron guardar los cambios generales.' }

    revalidatePath(`/`, 'layout')
    return { success: true }
}

/**
 * updateTicketSettingsAction:
 * Guarda o actualiza la configuración personalizada de los tickets de venta.
 */
export async function updateTicketSettingsAction(orgId: string, slug: string, data: any) {
    const success = await settingsService.upsertTicketSettings({
        organization_id: orgId,
        ...data
    });

    if (!success) return { error: 'Error al guardar la configuración del ticket.' }

    revalidatePath(`/`, 'layout')
    return { success: true }
}

/**
 * getBranchesAction:
 * Recupera la lista completa de sucursales.
 */
export async function setTerminalCookie(registerId: string) {
    console.log("Setting Terminal Cookie to:", registerId); // Debugging
    const cookieStore = await cookies()
    // Set cookie for 10 years (effectively permanent for this device)
    cookieStore.set('lac_terminal_id', registerId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365 * 10,
        sameSite: 'lax'
    })
    return { success: true }
}

export async function getBranchesAction(orgId: string) {
    try {
        const data = await settingsService.getBranches(orgId);
        return { success: true, data: data || [] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * upsertBranchAction:
 * Crea una sucursal nueva o actualiza una existente.
 */
export async function upsertBranchAction(orgId: string, branchData: any) {
    try {
        const data = {
            id: branchData.id, // Si existe, es update
            organization_id: orgId,
            name: branchData.name.toUpperCase().trim(),
            address: branchData.address?.trim() || null,
            phone: branchData.phone?.trim() || null,
            location: branchData.location?.trim() || null,
            manager: branchData.manager?.trim() || null,
            opening_hours: branchData.opening_hours?.trim() || null,
        };

        await settingsService.upsertBranch(data);

        revalidatePath(`/`, 'layout');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * deleteBranchAction:
 * Elimina permanentemente el registro de una sucursal por su ID.
 */
export async function deleteBranchAction(branchId: string) {
    try {
        const success = await settingsService.deleteBranch(branchId);
        if (!success) throw new Error("Error al eliminar");

        revalidatePath(`/`, 'layout');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "No se pudo eliminar la sucursal." };
    }
}

/**
 * updateOrganization:
 * Actualiza cualquier campo de la organización (incluyendo barcodeSettings).
 */
export async function updateOrganization(orgId: string, updates: any) {
    try {
        const success = await organizationService.update(orgId, updates);
        if (!success) throw new Error("Error al actualizar organización");

        revalidatePath(`/`, 'layout');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * getPriceListsAction:
 */
export async function getPriceListsAction(orgId: string) {
    try {
        const data = await settingsService.getPriceLists(orgId);
        return { success: true, data: data || [] }
    } catch (error: any) {
        return { success: false, error: "Error al cargar listas" }
    }
}

/**
 * upsertPriceListAction:
 */
export async function upsertPriceListAction(orgId: string, name: string, id?: string) {
    try {
        await settingsService.upsertPriceList({ organization_id: orgId, name, id });
        revalidatePath(`/`, 'layout');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * togglePriceListStatusAction:
 */
export async function togglePriceListStatusAction(orgId: string, listId: string, newState: boolean) {
    try {
        await settingsService.togglePriceListStatus(listId, newState);
        revalidatePath(`/`, 'layout');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * deletePriceListAction:
 */
export async function deletePriceListAction(orgId: string, listId: string) {
    try {
        await settingsService.deletePriceList(listId);
        revalidatePath(`/`, 'layout');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}