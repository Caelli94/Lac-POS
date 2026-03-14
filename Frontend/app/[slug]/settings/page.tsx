import { cookies } from 'next/headers'

import { notFound, redirect } from 'next/navigation'
import { SettingsTabs } from './settings-tabs'
import { getBranchesAction } from './actions'
import { organizationService } from '@/services/organizationService'
import { settingsService } from '@/services/settingsService'
import { cashService } from '@/services/cashService'

import { requireFeature } from '@/lib/guards';
import { getServerUser } from '@/lib/server-auth';

interface PageProps {
    params: Promise<{
        slug: string
    }>
}

/**
 * SettingsPage:
 * Componente principal de la página de ajustes. Recupera la información de la 
 * organización y las sucursales para pasarlas al gestor de pestañas.
 */
export default async function SettingsPage({ params }: PageProps) {
    const { slug } = await params
    // const supabase = await createClient()

    // 1. Verificación de sesión (MOCK)
    // const { data: { user }, error: authError } = await supabase.auth.getUser()
    // if (authError || !user) redirect('/auth/login')

    // 2. Obtener datos y Verificar Feature
    const org = await requireFeature(slug, 'settings');

    // 3. Obtener configuración de tickets (REAL)
    const ticketSettings = await settingsService.getTicketSettings(org.id);

    // 4. Obtener sucursales
    const branchesRes = await getBranchesAction(org.id);
    const branches = branchesRes.success ? branchesRes.data : [];

    // 5. Obtener cajas (REAL)
    const registers = await cashService.getRegistersByOrg(org.id);

    // 6. Obtener Terminal Local (Cookie)
    const cookieStore = await cookies()
    const currentTerminalId = cookieStore.get('lac_terminal_id')?.value

    const user = await getServerUser();
    const permissions = user?.roleId?.permissions || [];

    return (
        <div className="p-6 max-w-none mx-auto space-y-6 text-slate-900">
            <header className="flex flex-col gap-1 mb-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    Ajustes
                </h1>
                <p className="text-slate-500 text-sm font-medium">
                    Configuración de núcleo del sistema y sucursales.
                </p>
            </header>

            {/* Pasamos todos los datos al componente de pestañas */}
            <SettingsTabs
                org={org}
                ticketSettings={ticketSettings}
                branches={branches || []}
                registers={registers}
                currentTerminalId={currentTerminalId}
                slug={slug}
                permissions={permissions}
                userRole={user?.role}
            />
        </div>
    )
}