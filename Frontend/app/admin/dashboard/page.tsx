import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, LayoutDashboard, ShoppingCart, ChartBar } from 'lucide-react'
import { organizationService } from '@/services/organizationService'

export default async function AdminDashboard() {
    noStore();
    // 2. Obtener Real Stats
    const data = await organizationService.getSuperAdminStats();

    const stats = [
        {
            name: 'Total Compañías',
            value: data?.organizations?.total?.toString() || '0',
            icon: LayoutDashboard,
            color: 'text-blue-600',
            sub: data?.organizations?.growth ? `+${data.organizations.growth}% crecimiento` : 'Sin datos recientes'
        },
        {
            name: 'Usuarios Globales',
            value: data?.users?.total?.toString() || '0',
            icon: Users,
            color: 'text-green-600',
            sub: 'Usuarios activos en sistema'
        },
        {
            name: 'Ventas Globales (Mes)',
            value: data?.sales?.total
                ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(data.sales.total)
                : '$0',
            icon: ShoppingCart,
            color: 'text-yellow-600',
            sub: 'Facturación total del mes'
        },
        {
            name: 'Nuevas Empresas',
            value: data?.activity?.value?.toString() || '0',
            icon: ChartBar,
            color: 'text-purple-600',
            sub: 'Altas en el último mes'
        },
    ]

    return (
        <div className="p-8 min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 mb-6">Panel de Administración</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat) => (
                        <Card key={stat.name}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {stat.name}
                                </CardTitle>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <p className="text-xs text-muted-foreground">
                                    {stat.sub}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}