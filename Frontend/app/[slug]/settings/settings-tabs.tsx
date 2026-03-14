'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SettingsForm } from './settings-form'
import { TicketSettingsForm } from './ticket-settings-form'
import { PriceListSettings } from './price-list-settings'
import { BranchManager } from './branch-manager'
import { CashRegisterManager } from './cash-register-manager'
import { BarcodeSettings } from './barcode-settings'
import { AfipSettings } from './afip-settings'
import { BackupManager } from './backup-manager'
import { Loader2, Store, Settings, Receipt, Tag, Monitor, ScanBarcode, FileText, ShieldCheck } from 'lucide-react'


/**
 * SettingsTabs:
 */
export function SettingsTabs({ org, ticketSettings, branches, registers, slug, currentTerminalId, permissions, userRole }: any) {
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    const [mounted, setMounted] = useState(false)
    const [activeTab, setActiveTab] = useState('general')

    /**
     * useEffect:
     * ACLARACIÓN: Evita errores de hidratación asegurando que el código corra en el cliente.
     */
    useEffect(() => {
        setMounted(true)
        if (tabParam) {
            setActiveTab(tabParam)
        }
    }, [tabParam])

    const canViewTab = (tabId: string) => {
        // 0. Revisar Configuración de Organización (Super Admin)
        const disabledTabs = org?.settings?.disabled_tabs || [];
        if (disabledTabs.includes(tabId)) return false;

        // 1. Si es admin sin restricciones de rol, permitir todo
        if (userRole === 'admin' && (!permissions || permissions.length === 0)) return true;

        // 2. Buscar permisos del módulo 'settings'
        const settingsPerm = permissions?.find((p: any) => p.module === 'settings');
        if (!settingsPerm) return true; // Retrocompatibilidad: si no hay objeto de permisos de settings, permitir

        // 3. Buscar la pestaña específica
        const tab = settingsPerm.tabs?.find((t: any) => t.name === tabId);
        return tab ? tab.enabled : true; // Default true si la pestaña no está definida en el rol (permiso base)
    };

    if (!mounted) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-slate-200" size={32} />
            </div>
        )
    }

    const visibleTabs = [
        'general', 'tickets', 'pos', 'prices', 'branches', 'barcodes', 'afip', 'backups'
    ].filter(tabId => canViewTab(tabId));

    if (visibleTabs.length === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6 border border-rose-100 shadow-sm">
                    <ShieldCheck size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Acceso Restringido</h2>
                <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium">No tienes permisos habilitados en tu rol para visualizar este módulo de configuración.</p>
            </div>
        )
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-8 w-full justify-start h-auto p-1 bg-slate-100 rounded-2xl overflow-x-auto print:hidden">

                {canViewTab('general') && (
                    <TabsTrigger value="general" className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-[10px] uppercase tracking-wide group transition-all">
                        <div className="flex items-center gap-2">
                            <Settings size={14} />
                            INFORMACIÓN GENERAL
                        </div>
                    </TabsTrigger>
                )}
                {canViewTab('tickets') && (
                    <TabsTrigger value="tickets" className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-[10px] uppercase tracking-wide group transition-all">
                        <div className="flex items-center gap-2">
                            <Receipt size={14} />
                            TICKET
                        </div>
                    </TabsTrigger>
                )}
                {canViewTab('pos') && (
                    <TabsTrigger value="pos" className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-[10px] uppercase tracking-wide group transition-all">
                        <div className="flex items-center gap-2">
                            <Monitor size={14} />
                            PUNTOS DE VENTA
                        </div>
                    </TabsTrigger>
                )}
                {canViewTab('prices') && (
                    <TabsTrigger value="prices" className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-[10px] uppercase tracking-wide group transition-all">
                        <div className="flex items-center gap-2">
                            <Tag size={14} />
                            LISTAS DE PRECIOS
                        </div>
                    </TabsTrigger>
                )}
                {canViewTab('branches') && (
                    <TabsTrigger value="branches" className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-[10px] uppercase tracking-wide group transition-all">
                        <div className="flex items-center gap-2">
                            <Store size={14} />
                            SUCURSALES
                        </div>
                    </TabsTrigger>
                )}
                {canViewTab('barcodes') && (
                    <TabsTrigger value="barcodes" className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-[10px] uppercase tracking-wide group transition-all">
                        <div className="flex items-center gap-2">
                            <ScanBarcode size={14} />
                            CÓDIGOS DE BARRA
                        </div>
                    </TabsTrigger>
                )}
                {canViewTab('afip') && (
                    <TabsTrigger value="afip" className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-[10px] uppercase tracking-wide group transition-all">
                        <div className="flex items-center gap-2">
                            <FileText size={14} />
                            FACTURACIÓN ARCA
                        </div>
                    </TabsTrigger>
                )}
                {canViewTab('backups') && (
                    <TabsTrigger value="backups" className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-[10px] uppercase tracking-wide group transition-all">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} />
                            COPIAS DE SEGURIDAD
                        </div>
                    </TabsTrigger>
                )}
            </TabsList>



            {/* PESTAÑA 1: Información General */}
            {canViewTab('general') && (
                <TabsContent value="general" className="animate-in fade-in slide-in-from-bottom-2 duration-400 focus-visible:outline-none">
                    <SettingsForm
                        org={org}
                        key={JSON.stringify(org)}
                    />
                </TabsContent>
            )}

            {/* PESTAÑA 2: Ticket y Facturación */}
            {canViewTab('tickets') && (
                <TabsContent value="tickets" className="animate-in fade-in slide-in-from-bottom-2 duration-400 focus-visible:outline-none">
                    <TicketSettingsForm
                        org={org}
                        slug={slug}
                        initialData={ticketSettings}
                    />
                </TabsContent>
            )}

            {/* PESTAÑA 5: Puntos de Venta */}
            {canViewTab('pos') && (
                <TabsContent value="pos" className="animate-in fade-in slide-in-from-bottom-2 duration-400 focus-visible:outline-none">
                    <CashRegisterManager
                        registers={registers}
                        branches={branches}
                        orgId={org.id}
                        currentTerminalId={currentTerminalId}
                    />
                </TabsContent>
            )}

            {/* PESTAÑA 3: Listas de Precios */}
            {canViewTab('prices') && (
                <TabsContent value="prices" className="animate-in fade-in slide-in-from-bottom-2 duration-400 focus-visible:outline-none">
                    <PriceListSettings orgId={org.id} />
                </TabsContent>
            )}

            {/* PESTAÑA 4: Sucursales (CORREGIDA) */}
            {canViewTab('branches') && (
                <TabsContent value="branches" className="animate-in fade-in slide-in-from-bottom-2 duration-400 focus-visible:outline-none">
                    <BranchManager
                        branches={branches}
                        orgId={org.id}
                    />
                </TabsContent>
            )}

            {/* PESTAÑA 6: Códigos de Barra */}
            {canViewTab('barcodes') && (
                <TabsContent value="barcodes" className="animate-in fade-in slide-in-from-bottom-2 duration-400 focus-visible:outline-none">
                    <BarcodeSettings
                        settings={org.barcodeSettings}
                        orgId={org.id}
                    />
                </TabsContent>
            )}

            {/* PESTAÑA 7: AFIP */}
            {canViewTab('afip') && (
                <TabsContent value="afip" className="animate-in fade-in slide-in-from-bottom-2 duration-400 focus-visible:outline-none">
                    <AfipSettings org={org} />
                </TabsContent>
            )}

            {/* PESTAÑA 8: Backups */}
            {canViewTab('backups') && (
                <TabsContent value="backups" className="animate-in fade-in slide-in-from-bottom-2 duration-400 focus-visible:outline-none">
                    <BackupManager />
                </TabsContent>
            )}
        </Tabs>
    )
}