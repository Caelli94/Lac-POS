'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Landmark, Plus, ArrowUpRight, ArrowDownLeft, Search, Calendar, ChevronLeft, ChevronRight, Edit, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { organizationService } from '@/services/organizationService'
import { authService } from '@/services/authService'
import { checkService } from '@/services/checkService'
import { CheckModal } from './components/check-modal'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function ChecksPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const [org, setOrg] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [checks, setChecks] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'own' | 'third_party'>('own');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedCheck, setSelectedCheck] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        const [orgData, userData] = await Promise.all([
            organizationService.getBySlug(slug),
            authService.getMe()
        ]);
        if (orgData) setOrg(orgData);
        if (userData) setUser(userData);
    }, [slug]);

    const fetchChecks = useCallback(async () => {
        if (!org) return;
        setLoading(true);
        try {
            const orgId = org._id || org.id;
            const res = await checkService.getAll(orgId, {
                type: activeTab,
                search,
                page: currentPage,
                limit: 8
            });
            setChecks(res.checks || []);
            setTotal(res.total || 0);
            setTotalPages(res.pages || 1);
        } catch (error) {
            toast.error("Error al cargar los cheques");
        } finally {
            setLoading(false);
        }
    }, [org, activeTab, search, currentPage]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchChecks();
    }, [fetchChecks]);

    const disabledTabs = org?.settings?.disabled_tabs || [];

    const isTabEnabled = useCallback((tabId: string) => {
        // 1. Check Global Organization Config
        if (disabledTabs.includes(tabId)) return false;

        // 2. Admin/SuperAdmin Bypass
        if (user?.role === 'admin' || user?.role === 'superadmin') return true;

        // 3. User Role Permissions
        if (user && user.roleId?.permissions) {
            const modulePerm = user.roleId.permissions.find((p: any) => p.module === 'checks');
            if (modulePerm) {
                // Si el permiso maestro 'view' es false, bloqueo total
                if (modulePerm.view === false) return false;

                // Si tiene 'view' true pero no hay pestañas definidas (compatibilidad), permitimos todas
                if (!modulePerm.tabs || modulePerm.tabs.length === 0) return true;

                // Si hay pestañas definidas, respetamos su flag 'enabled'
                const tabPerm = modulePerm.tabs.find((t: any) => t.name === tabId);
                return tabPerm ? tabPerm.enabled : false;
            }
        }

        return false;
    }, [disabledTabs, user]);

    // Ajustar tab activa si la actual está deshabilitada
    useEffect(() => {
        if (org && !isTabEnabled(activeTab)) {
            const tabs = ['own', 'third_party'];
            const nextTab = tabs.find(t => isTabEnabled(t)) as 'own' | 'third_party';
            if (nextTab) setActiveTab(nextTab);
        }
    }, [activeTab, user, org, isTabEnabled]);

    const canEdit = user?.role === 'admin' || user?.role === 'superadmin' ||
        (user?.roleId?.permissions?.find((p: any) => p.module === 'checks')?.edit ?? false);

    const canDelete = user?.role === 'admin' || user?.role === 'superadmin' ||
        (user?.roleId?.permissions?.find((p: any) => p.module === 'checks')?.delete ?? false);

    if (!org) return (
        <div className="p-6 flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
    );

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (['pagado', 'cobrado', 'confirmado'].includes(s)) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (['pendiente', 'por cobrar'].includes(s)) return 'bg-amber-100 text-amber-700 border-amber-200';
        if (['entregado', 'depositado'].includes(s)) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (['anulado', 'rechazado'].includes(s)) return 'bg-rose-100 text-rose-700 border-rose-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await checkService.delete(deleteId);
            toast.success("Cheque eliminado");
            setDeleteId(null);
            fetchChecks();
        } catch (error) {
            toast.error("Error al eliminar");
        }
    }

    const getDaysRemaining = (dueDate: string | Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(dueDate);
        target.setHours(0, 0, 0, 0);

        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    const openEdit = (check: any) => {
        setSelectedCheck(check);
        setIsModalOpen(true);
    }

    const openAdd = () => {
        setSelectedCheck(null);
        setIsModalOpen(true);
    }

    return (
        <div className="p-6 max-w-none mx-auto space-y-6 animate-in fade-in duration-500">
            {/* HEADER LAC POS */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        Cheques
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Gestión de cartera de cheques propios y de terceros.</p>
                </div>

                <div className="flex items-center gap-3">
                    {canEdit && (
                        <Button
                            onClick={openAdd}
                            className="bg-black hover:bg-slate-800 text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Registrar Cheque
                        </Button>
                    )}
                </div>
            </header>

            {/* FILTROS Y BUSCADOR */}
            {(isTabEnabled('own') || isTabEnabled('third_party')) && (
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input
                            placeholder="Buscar por número, banco o CUIT..."
                            className="pl-11 h-11 bg-slate-50 border-slate-100 rounded-xl focus:ring-2 focus:ring-slate-900/5 transition-all font-medium text-sm"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black uppercase tracking-tight text-slate-400 mr-2">Total en vista: <span className="text-slate-900">{total}</span></p>
                    </div>
                </div>
            )}

            {/* TABS NAVIGATION */}
            {(isTabEnabled('own') || isTabEnabled('third_party')) && (
                <Tabs defaultValue="own" className="w-full" onValueChange={(v) => { setActiveTab(v as any); setCurrentPage(1); }}>
                    <TabsList className="mb-6 w-full justify-start h-auto p-1 bg-slate-100 rounded-2xl overflow-x-auto">
                        {isTabEnabled('own') && (
                            <TabsTrigger
                                value="own"
                                className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 font-bold flex items-center gap-2 transition-all"
                            >
                                <ArrowUpRight size={18} className="text-rose-500" /> CHEQUES PROPIOS
                            </TabsTrigger>
                        )}
                        {isTabEnabled('third_party') && (
                            <TabsTrigger
                                value="third_party"
                                className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 font-bold flex items-center gap-2 transition-all"
                            >
                                <ArrowDownLeft size={18} className="text-emerald-500" /> CHEQUES DE TERCEROS
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[50vh] flex flex-col">
                        <div className="overflow-x-auto flex-grow">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="px-6 py-4">Banco / Número</th>
                                        <th className="px-6 py-4">Monto</th>
                                        <th className="px-6 py-4">Vencimiento</th>
                                        <th className="px-6 py-4">{activeTab === 'own' ? 'Destinatario' : 'Emisor'}</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cargando cheques...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : checks.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-4 text-slate-200">
                                                    <Landmark size={64} className="opacity-20" />
                                                    <div className="space-y-1">
                                                        <p className="font-black uppercase tracking-widest text-xs text-slate-400">No se encontraron cheques</p>
                                                        <p className="text-[10px] font-medium text-slate-300 uppercase tracking-widest italic">Ajuste los filtros o registre un nuevo cheque</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        checks.map((check) => (
                                            <tr key={check._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-900 uppercase">{check.bank}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 font-mono">#{check.number}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="text-sm font-black text-slate-900">
                                                        {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(check.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar size={14} className="text-slate-300" />
                                                            <span className="text-xs font-bold text-slate-600 uppercase">
                                                                {format(new Date(check.due_date), 'dd MMM yyyy', { locale: es })}
                                                            </span>
                                                        </div>
                                                        {(() => {
                                                            const days = getDaysRemaining(check.due_date);
                                                            return (
                                                                <div className={cn(
                                                                    "text-[9px] font-black uppercase tracking-widest pl-5",
                                                                    days >= 0 ? "text-emerald-500" : "text-rose-500"
                                                                )}>
                                                                    {days === 0 ? '¡Vence Hoy!' : (days > 0 ? `Quedan ${days} días` : `Venció hace ${Math.abs(days)} días`)}
                                                                </div>
                                                            )
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-700 uppercase">{check.entity}</span>
                                                        {check.cuit && <span className="text-[10px] font-medium text-slate-400">{check.cuit}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <Badge className={cn("rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter border shadow-none", getStatusColor(check.status))}>
                                                        {check.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    {(canEdit || canDelete) && (
                                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {canEdit && (
                                                                <Button variant="ghost" size="icon" onClick={() => openEdit(check)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                                                    <Edit size={14} />
                                                                </Button>
                                                            )}
                                                            {canDelete && (
                                                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(check._id)} className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50">
                                                                    <Trash2 size={14} />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                    </div>
                </Tabs>
            )}

            {/* PAGINACIÓN ESTILO CLIENTES (FUERA DEL BOX) */}
            {(isTabEnabled('own') || isTabEnabled('third_party')) && (
                <div className="flex items-center justify-between p-2 mt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Mostrando {(currentPage - 1) * 8 + 1} a {Math.min(currentPage * 8, total)} de {total} cheques (Página {currentPage} de {totalPages})
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || loading}
                            className="h-8 w-8 p-0 rounded-lg text-slate-500 border-slate-200 bg-white shadow-sm"
                        >
                            <ChevronLeft size={14} />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pNum = i + 1;
                                if (totalPages > 5 && currentPage > 3) pNum = currentPage - 2 + i;
                                if (pNum > totalPages) return null;
                                if (pNum < 1) return null;

                                return (
                                    <Button
                                        key={pNum}
                                        variant={currentPage === pNum ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(pNum)}
                                        disabled={loading}
                                        className={cn(
                                            "h-8 w-8 p-0 rounded-lg text-[10px] font-black transition-all",
                                            currentPage === pNum
                                                ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                                                : "text-slate-500 border-slate-200 bg-white hover:bg-slate-100 shadow-sm"
                                        )}
                                    >
                                        {pNum}
                                    </Button>
                                );
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage >= totalPages || loading}
                            className="h-8 w-8 p-0 rounded-lg text-slate-500 border-slate-200 bg-white shadow-sm"
                        >
                            <ChevronRight size={14} />
                        </Button>
                    </div>
                </div>
            )}

            {/* ACCESO RESTRINGIDO - ESTILO COMPRAS (SOLICITADO POR USUARIO) */}
            {!(isTabEnabled('own') || isTabEnabled('third_party')) && (
                <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6 border border-rose-100 shadow-sm">
                        <AlertTriangle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">Acceso Restringido</h2>
                    <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium">No tienes permisos habilitados en tu rol para visualizar este módulo.</p>
                </div>
            )}

            {/* MODAL PARA REGISTRO/EDICIÓN */}
            <CheckModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                orgId={org._id || org.id}
                onSuccess={fetchChecks}
                defaultType={activeTab}
                editingCheck={selectedCheck}
            />

            {/* DIALOGO DE CONFIRMACIÓN (Estética idéntica a Clientes) */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Eliminar Cheque?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-destructive">
                            <AlertTriangle size={32} />
                        </div>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Esta acción no se puede deshacer. El cheque será eliminado permanentemente de la cartera.
                        </p>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button
                                variant="outline"
                                onClick={() => setDeleteId(null)}
                                className="rounded-xl h-12 font-bold uppercase text-[10px] tracking-widest border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-all text-slate-900"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmDelete}
                                className="bg-red-600 hover:bg-[#5c5cfc] text-white rounded-xl h-12 font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-red-100 hover:shadow-indigo-100"
                            >
                                Sí, Eliminar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
