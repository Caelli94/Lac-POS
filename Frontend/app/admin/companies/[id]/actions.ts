'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { organizationService } from '@/services/organizationService'

export async function toggleFeatureAction(organizationId: string, featureCode: string, isEnabled: boolean) {
    // Usamos el servicio que conecta al backend
    const success = await organizationService.toggleFeature(organizationId, featureCode, isEnabled);

    if (!success) {
        throw new Error('No se pudo actualizar el módulo')
    }

    // --- PASO CLAVE: REVALIDAR LAYOUT DEL CLIENTE ---
    revalidatePath('/', 'layout');

    // 2. Revalidar la página del Admin
    revalidatePath(`/admin/companies/${organizationId}`)
}

export async function updateSettingsAction(organizationId: string, settings: any) {
    const success = await organizationService.update(organizationId, { settings });

    if (!success) {
        throw new Error('No se pudo actualizar la configuración');
    }

    revalidatePath('/', 'layout');
    revalidatePath(`/admin/companies/${organizationId}`);
}

export async function updateOrganizationAction(organizationId: string, data: any) {
    const success = await organizationService.update(organizationId, data);

    if (!success) {
        return { success: false, error: 'No se pudo actualizar la organización' };
    }

    revalidatePath(`/admin/companies/${organizationId}`);
    return { success: true };
}

export async function toggleStatusAction(organizationId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const success = await organizationService.update(organizationId, { subscription_status: newStatus });

    if (!success) {
        throw new Error('No se pudo cambiar el estado de la organización');
    }

    revalidatePath('/admin/companies');
    revalidatePath(`/admin/companies/${organizationId}`);
    revalidatePath('/admin/accounting');
    return { success: true, newStatus };
}