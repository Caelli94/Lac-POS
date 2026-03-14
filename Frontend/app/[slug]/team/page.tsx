
import { organizationService } from '@/services/organizationService'
import { requireFeature } from '@/lib/guards';
import { TeamManager } from './team-manager'
import { getServerUser } from '@/lib/server-auth'

interface Props {
    params: Promise<{ slug: string }>
}

export default async function TeamPage({ params }: Props) {
    const { slug } = await params
    const org = await requireFeature(slug, 'team');

    const user = await getServerUser()
    const permissions = user?.roleId?.permissions || []

    return (
        <div className="p-6 max-w-none mx-auto space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Equipo
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    Gestiona los miembros de tu organización y sus permisos.
                </p>
            </header>

            <TeamManager
                orgId={org.id}
                currentUserId={user?._id || user?.id}
                userRole={user?.role}
                permissions={permissions}
                features={org.features?.filter((f: any) => f.is_enabled).map((f: any) => f.code) || []}
                disabledTabs={org.settings?.disabled_tabs || []}
                isAuditManager={user?.isAuditManager}
            />
        </div>
    )
}
