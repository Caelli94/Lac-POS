export const dynamic = 'force-dynamic';
import { organizationService } from '@/services/organizationService'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet } from "lucide-react"
import { AccountingTable } from './accounting-table'

export default async function AccountingPage() {
    const rawOrgs = await organizationService.getAll()

    // Mapear y asegurar estructura
    const organizations = rawOrgs.map((org: any) => ({
        ...org,
        id: org._id || org.id,
    }))

    // Calcular estadísticas requeridas
    const totalActive = organizations.filter((org: any) => org.subscription_status === 'active').length
    const totalSuspended = organizations.filter((org: any) => org.subscription_status === 'suspended').length

    // Clientes con Deuda (Vencimiento pasado)
    const today = new Date()
    const debtors = organizations.filter((org: any) => {
        const nextDue = org.subscription_details?.next_due_date ? new Date(org.subscription_details.next_due_date) : null
        return nextDue && nextDue < today
    }).length

    return (
        <div className="p-8 min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* ENCABEZADO */}
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Wallet size={36} className="text-slate-900" />
                            CONTABILIDAD
                        </h1>
                        <p className="text-slate-500 font-medium">Panel de control financiero, abonos y ciclos de facturación.</p>
                    </div>
                </div>

                {/* STATS RÁPIDAS (Clientes Activos, Suspendidos, Con Deuda) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden border-l-4 border-l-green-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clientes Activos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black text-slate-900">{totalActive}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden border-l-4 border-l-slate-300">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clientes Suspendidos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black text-slate-900">{totalSuspended}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden border-l-4 border-l-red-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clientes con Deuda</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-black text-red-600">{debtors}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* COMPONENTE DE TABLA CON BUSCADOR */}
                <AccountingTable organizations={organizations} />

            </div>
        </div>
    )
}
