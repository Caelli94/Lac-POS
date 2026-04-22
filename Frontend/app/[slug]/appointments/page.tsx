'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, Bell, Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { organizationService } from '@/services/organizationService'
import { authService } from '@/services/authService'
import { CalendarTab } from './components/calendar-tab'
import { AlertsTab } from './components/alerts-tab'
import { ConfigTab } from './components/config-tab'
import { AppointmentModal } from './components/appointment-modal'

export default function AppointmentsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const [org, setOrg] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            const [orgData, userData] = await Promise.all([
                organizationService.getBySlug(slug),
                authService.getMe()
            ]);
            if (orgData) setOrg(orgData);
            if (userData) setUser(userData);
        };
        fetchData();
    }, [slug]);

    const orgId = org?._id || org?.id;
    const disabledTabs = org?.settings?.disabled_tabs || [];

    const isTabEnabled = useCallback((tabId: string) => {
        // 1. Check Global Organization Config
        if (disabledTabs.includes(tabId)) return false;

        // 2. Admin/SuperAdmin Bypass
        if (user?.role === 'admin' || user?.role === 'superadmin') return true;

        // 3. User Role Permissions (if member)
        if (user && user.roleId?.permissions) {
            const modulePerm = user.roleId.permissions.find((p: any) => p.module === 'appointments');
            if (modulePerm) {
                // Si el permiso maestro 'view' es false, bloqueo total
                if (modulePerm.view === false) return false;

                // Si tiene 'view' true pero no hay pestañas definidas (compatibilidad), permitimos acceso
                if (!modulePerm.tabs || modulePerm.tabs.length === 0) return true;

                // Si hay pestañas definidas, respetamos el flag 'enabled'
                const tabPerm = modulePerm.tabs.find((t: any) => t.name === tabId);
                return tabPerm ? tabPerm.enabled : false;
            }
        }

        return true;
    }, [disabledTabs, user]);

    // Determinar la pestaña inicial habilitada
    const tabs = ['calendar', 'alerts', 'settings'];
    const defaultTab = tabs.find(t => isTabEnabled(t)) || 'calendar';

    const canEdit = user?.role === 'admin' || user?.role === 'superadmin' ||
        (user?.roleId?.permissions?.find((p: any) => p.module === 'appointments')?.edit ?? false);

    const canDelete = user?.role === 'admin' || user?.role === 'superadmin' ||
        (user?.roleId?.permissions?.find((p: any) => p.module === 'appointments')?.delete ?? false);

    if (!org) return (
        <div className="p-6 flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="p-6 max-w-none mx-auto space-y-6 animate-in fade-in duration-500">
            {/* HEADER LAC POS */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        Turnero
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Gestión de turnos y agendas de clientes.</p>
                </div>

                <div className="flex items-center gap-3">
                    {canEdit && (
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-black hover:bg-slate-800 text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Agendar Turno
                        </Button>
                    )}
                </div>
            </header>

            {/* TABS NAVIGATION */}
            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="mb-6 w-full justify-start h-auto p-1 bg-slate-100 rounded-2xl overflow-x-auto">
                    {isTabEnabled('calendar') && (
                        <TabsTrigger
                            value="calendar"
                            className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold flex items-center gap-2"
                        >
                            <CalendarDays size={18} /> CALENDARIO
                        </TabsTrigger>
                    )}
                    {isTabEnabled('alerts') && (
                        <TabsTrigger
                            value="alerts"
                            className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold flex items-center gap-2"
                        >
                            <Bell size={18} /> RADAR DE ALERTAS
                        </TabsTrigger>
                    )}
                    {isTabEnabled('settings') && (
                        <TabsTrigger
                            value="settings"
                            className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-bold flex items-center gap-2"
                        >
                            <Settings size={18} /> CONFIGURACIÓN
                        </TabsTrigger>
                    )}
                </TabsList>

                {isTabEnabled('calendar') && (
                    <TabsContent value="calendar">
                        <CalendarTab
                            orgId={orgId}
                            key={refreshKey}
                            canEdit={canEdit}
                            canDelete={canDelete}
                        />
                    </TabsContent>
                )}

                {isTabEnabled('alerts') && (
                    <TabsContent value="alerts">
                        <AlertsTab orgId={orgId} key={refreshKey} />
                    </TabsContent>
                )}

                {isTabEnabled('settings') && (
                    <TabsContent value="settings">
                        <ConfigTab org={org} />
                    </TabsContent>
                )}
            </Tabs>

            {/* MODAL PARA AGENDAR */}
            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                orgId={orgId}
                onSuccess={() => setRefreshKey(prev => prev + 1)}
                defaultDuration={org?.settings?.appointments?.default_duration || 30}
            />
        </div>
    )
}
