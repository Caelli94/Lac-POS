import { requireFeature } from '@/lib/guards'
import { AgendaWidget } from './components/dashboard/agenda-widget'

export default async function TenantDashboard({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params

    // Protect the route: "Inicio" module (code: agenda) must be enabled
    const org = await requireFeature(slug, 'agenda')

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Bienvenido al Panel</h1>
            <p className="text-slate-500 mt-2">Estás en el dashboard principal de <strong>{slug}</strong>.</p>

            <div className="grid grid-cols-1 gap-6 mt-8">
                {/* Agenda Widget (Already guaranteed enabled by requireFeature) */}
                <AgendaWidget orgId={org.id} />
            </div>
        </div>
    )
}