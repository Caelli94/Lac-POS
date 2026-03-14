'use server'

import { revalidatePath } from 'next/cache'
import { organizationService } from '@/services/organizationService'

export async function updateInventorySettingsAction(organizationId: string, slug: string, settings: any) {
    const success = await organizationService.update(organizationId, { settings });

    if (!success) {
        throw new Error('No se pudo actualizar la configuración');
    }

    revalidatePath(`/${slug}/inventory`);
    revalidatePath(`/${slug}`); // In case sidebar or other things depend on it
}
