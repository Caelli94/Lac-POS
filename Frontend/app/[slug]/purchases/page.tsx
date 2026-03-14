import { notFound } from 'next/navigation'
import { organizationService } from '@/services/organizationService'
import { purchasesService } from '@/services/purchasesService'
import { requireFeature } from '@/lib/guards';
import { orderService } from '@/services/orderService';
import { customerService } from '@/services/customerService';
import { AlertTriangle } from 'lucide-react';
import { getServerUser } from '@/lib/server-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PurchasesTab } from './purchases-tab'
import { OrdersTab } from './orders/orders-tab'

export default async function PurchasesPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params

    // Auth & Permissions
    const user: any = await getServerUser();
    const org = await requireFeature(slug, 'purchases');

    // Role Validation
    const disabledTabs = org.settings?.disabled_tabs || [];
    const modulePerm = user?.roleId?.permissions?.find((p: any) => p.module === 'purchases');

    const isTabEnabled = (tabId: string) => {
        if (disabledTabs.includes(tabId)) return false;
        if (user?.role === 'admin' || user?.role === 'superadmin') return true;

        if (modulePerm) {
            // Si el permiso maestro 'view' es false, cerramos todo
            if (modulePerm.view === false) return false;

            // Si tiene 'view' true pero no hay pestañas definidas (compatibilidad), permitimos todas
            if (!modulePerm.tabs || modulePerm.tabs.length === 0) return true;

            // Si hay pestañas, respetamos su flag 'enabled'
            const tabPerm = modulePerm.tabs.find((t: any) => t.name === tabId);
            return tabPerm ? tabPerm.enabled : false;
        }
        return false;
    };

    const canEdit = user?.role === 'admin' || user?.role === 'superadmin' || (modulePerm?.edit ?? false);
    const canDelete = user?.role === 'admin' || user?.role === 'superadmin' || (modulePerm?.delete ?? false);

    // Si ninguna pestaña está habilitada, mostrar acceso denegado (doble check fuera del layout)
    if (!isTabEnabled('purchases') && !isTabEnabled('orders')) {
        return (
            <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6 border border-rose-100">
                    <AlertTriangle size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Acceso Restringido</h2>
                <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium">No tienes permisos habilitados en tu rol para visualizar este módulo.</p>
            </div>
        );
    }

    // Fetch Data Parallel
    const [purchases, orders, customers] = await Promise.all([
        purchasesService.getAll(org.id),
        orderService.getAll(org.id),
        customerService.getAll(org.id)
    ]);

    const defaultTab = isTabEnabled('purchases') ? 'purchases' : 'orders';

    return (
        <div className="p-6 max-w-none mx-auto space-y-8 bg-slate-50/50 min-h-screen">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Compras y Encargues
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Gestiona tus proveedores y pedidos especiales.</p>
                </div>
            </header>

            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="mb-6 w-full justify-start h-auto p-1 bg-slate-100 rounded-2xl overflow-x-auto print:hidden">
                    {isTabEnabled('purchases') && (
                        <TabsTrigger
                            value="purchases"
                            className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-xs uppercase tracking-wide group transition-all"
                        >
                            Compras
                        </TabsTrigger>
                    )}
                    {isTabEnabled('orders') && (
                        <TabsTrigger
                            value="orders"
                            className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-xs uppercase tracking-wide group transition-all"
                        >
                            Encargues
                        </TabsTrigger>
                    )}
                </TabsList>

                {isTabEnabled('purchases') && (
                    <TabsContent value="purchases" className="mt-0">
                        <PurchasesTab
                            purchases={purchases}
                            slug={slug}
                            canEdit={canEdit}
                        />
                    </TabsContent>
                )}

                {isTabEnabled('orders') && (
                    <TabsContent value="orders" className="mt-0">
                        <OrdersTab
                            orders={orders}
                            customers={customers.data || []}
                            orgId={org.id}
                            slug={slug}
                            currentUser={user}
                            canEdit={canEdit}
                            canDelete={canDelete}
                        />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
