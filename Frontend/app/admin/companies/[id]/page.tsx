import { unstable_noStore as noStore } from 'next/cache';
import { organizationService } from '@/services/organizationService'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { FeatureToggle } from './feature-toggle'
import { ModuleItem } from './module-item'
import { LimitsForm } from './limits-form'
import { FinanceForm } from './finance-form'

// 1. Interfaces
interface Props {
    params: Promise<{ id: string }>
    searchParams: Promise<{ tab?: string }>
}

interface Feature {
    code: string;
    name: string;
    description: string;
}

interface OrgFeature {
    feature_code: string;
    is_enabled: boolean;
}

export default async function CompanyDetailsPage({ params, searchParams }: Props) {
    noStore();
    const { id: orgId } = await params
    const { tab } = await searchParams
    const initialTab = tab || 'modules'

    // 1. Cargar Empresa (REAL)
    const orgData = await organizationService.getById(orgId);

    if (!orgData) return notFound()

    // Mapear respuesta de Mongo a la estructura interna si es necesario
    const org = {
        id: orgData._id || orgData.id,
        name: orgData.name,
        subscription_status: orgData.subscription_status || 'active',
        features: orgData.features || [],
        settings: orgData.settings || {}
    };

    // 2. Cargar Catálogo (MOCK - Esto podría estar en DB o constante)
    // DEFINIMOS EL ORDEN EXACTO AQUÍ DIRECTAMENTE PARA EVITAR ERRORES DE SORTING
    const globalFeatures: Feature[] = [
        { code: 'agenda', name: 'Inicio', description: 'Calendario y gestión de tareas' },
        { code: 'pos', name: 'Punto de Venta', description: 'Ventas rápidas' },
        { code: 'inventory', name: 'Inventario', description: 'Control de stock' },
        { code: 'customers', name: 'Clientes', description: 'Gestión de clientes' },
        { code: 'appointments', name: 'Turnero', description: 'Gestión de turnos y agendas' },
        { code: 'suppliers', name: 'Proveedores', description: 'Gestión de proveedores' },
        { code: 'checks', name: 'Cheques', description: 'Gestión de cheques propios y de terceros' },
        { code: 'purchases', name: 'Compras/Encargues', description: 'Registro de compras y encargues' },
        { code: 'cash', name: 'Caja', description: 'Control de caja' },
        { code: 'sales', name: 'Historial', description: 'Historial de ventas' },
        { code: 'invoices', name: 'Reportes Fiscales', description: 'Reportes fiscales y libre IVA' },
        { code: 'mass-update', name: 'Actualización Masiva', description: 'Actualización masiva de precios y costos' },
        { code: 'statistics', name: 'Estadísticas', description: 'Reportes y métricas' },
        { code: 'import-export', name: 'Importar/Exportar', description: 'Importación masiva y exportación de datos' },
        { code: 'web-page', name: 'Página Web', description: 'Configuración de sitio web' },
        { code: 'team', name: 'Equipo', description: 'Gestión de usuarios y roles' },
        { code: 'commissions', name: 'Comisiones', description: 'Reglas de venta básicas por rol' },
        { code: 'advanced_commissions', name: 'Comisiones Avanzadas', description: 'Reglas dinámicas, categorías, listas de precios e incentivos escala' },
        { code: 'personalization', name: 'Personalización', description: 'Personalizar apariencia' },
        { code: 'integrations', name: 'Integraciones', description: 'Conectar servicios externos' },
        { code: '2fa', name: 'Seguridad', description: 'Seguridad de doble factor para usuarios' },
        { code: 'settings', name: 'Ajustes', description: 'Configuración general' },
        { code: 'guide', name: 'Guía', description: 'Manual de usuario y documentación' },
        { code: 'ai_assistant', name: 'Asistente IA', description: 'IA inteligente para rescatar datos y guía de procesos' },
    ];

    // 3. Cargar Módulos ACTIVOS
    // Mapeamos los features activados en la organización
    const orgFeatures: OrgFeature[] = org.features.map((f: any) => ({
        feature_code: f.code,
        is_enabled: f.is_enabled
    }));

    // 4. USAMOS DIRECTAMENTE globalFeatures (ya está ordenado)
    // Usamos la lista MODULE_ORDER para forzar el orden visual
    // const sortedFeatures = globalFeatures?.sort((a, b) => {
    //     const indexA = MODULE_ORDER.indexOf(a.code)
    //     const indexB = MODULE_ORDER.indexOf(b.code)
    //     // Si alguno no está en la lista (ej: un módulo nuevo), lo manda al final
    //     return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
    // })
    const sortedFeatures = globalFeatures;

    return (
        <div className="p-8 min-h-screen bg-slate-50">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="mb-6">
                    <Link href="/admin/companies" className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2">
                        <ArrowLeft size={14} /> Volver a la lista
                    </Link>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                                {org.name}
                                {org.subscription_status === 'active'
                                    ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Activo</Badge>
                                    : <Badge variant="destructive">Suspendido</Badge>
                                }
                            </h1>
                            <p className="text-slate-500 font-mono mt-1 text-sm">ID: {org.id}</p>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue={initialTab} className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="modules">Módulos</TabsTrigger>
                        <TabsTrigger value="details">Prestaciones</TabsTrigger>
                        <TabsTrigger value="finance">Finanzas</TabsTrigger>
                    </TabsList>

                    {/* PESTAÑA MÓDULOS */}
                    <TabsContent value="modules">
                        <Card>
                            <CardHeader>
                                <CardTitle>Configuración de Módulos</CardTitle>
                                <CardDescription>Activa o desactiva funcionalidades para este cliente.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">

                                {/* Usamos sortedFeatures en lugar de globalFeatures */}
                                {sortedFeatures?.map((feature) => {
                                    const currentConfig = orgFeatures?.find(of => of.feature_code === feature.code)
                                    const isEnabled = currentConfig?.is_enabled ?? false

                                    return (
                                        <ModuleItem
                                            key={feature.code}
                                            feature={feature}
                                            isEnabled={isEnabled}
                                            orgId={org.id}
                                            settings={org.settings}
                                        />
                                    )
                                })}

                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="details">
                        <LimitsForm orgId={org.id} settings={org.settings} />
                    </TabsContent>

                    <TabsContent value="finance">
                        <FinanceForm orgId={org.id} subscriptionDetails={orgData.subscription_details} />
                    </TabsContent>
                </Tabs>

            </div>
        </div>
    )
}