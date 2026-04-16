'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Banknote, History, ShieldEllipsis, Plus, Trash2, Pencil, 
    Settings2, Percent, DollarSign, Target, ChevronRight, AlertCircle,
    Check, X, Loader2, Filter, Search, Calendar, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function CommissionsPage() {
    const params = useParams();
    const slug = params.slug as string;

    // Data State
    const [organizationId, setOrganizationId] = useState<string>('');
    const [rules, setRules] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [priceLists, setPriceLists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<any>(null);
    const [categorySearch, setCategorySearch] = useState('');

    const initialFormData = {
        name: '',
        priority: 0,
        active: true,
        conditions: {
            roles: [],
            categories: [], // Selected category IDs
            payment_methods: [],
            price_lists: []
        },
        action: {
            type: 'percentage',
            base: 'gross',
            value: 0
        },
        scales: []
    };

    const [formData, setFormData] = useState<any>(initialFormData);

    const paymentMethods = [
        { id: 'cash', name: 'Efectivo' },
        { id: 'credit_card', name: 'Tarjeta de Crédito' },
        { id: 'debit_card', name: 'Tarjeta de Débito' },
        { id: 'transfer', name: 'Transferencia' },
        { id: 'check', name: 'Cheque' },
        { id: 'ACCOUNT', name: 'Cuenta Corriente' }
    ];

    const fetchAllData = async () => {
        if (!slug) return;
        setLoading(true);
        try {
            const baseUrl = '/api';
            
            // 1. Get Organization ID from slug
            const orgRes = await fetch(`${baseUrl}/organizations/by-slug/${slug}`, { credentials: 'include' });
            const orgData = await orgRes.json();
            if (!orgData || !orgData._id) {
                console.error("No organization found for slug:", slug);
                return;
            }
            const orgId = orgData._id;
            setOrganizationId(orgId);

            // 2. Parallel Fetches
            const [rulesRes, historyRes, rolesRes, catsRes, priceRes] = await Promise.all([
                fetch(`${baseUrl}/commissions/rules/${orgId}`, { credentials: 'include' }),
                fetch(`${baseUrl}/commissions/history/${orgId}`, { credentials: 'include' }),
                fetch(`${baseUrl}/roles/${orgId}`, { credentials: 'include' }),
                fetch(`${baseUrl}/categories/${orgId}`, { credentials: 'include' }),
                fetch(`${baseUrl}/price-lists/${orgId}`, { credentials: 'include' })
            ]);

            if (rulesRes.ok) setRules(await rulesRes.json());
            if (historyRes.ok) setHistory(await historyRes.json());
            if (rolesRes.ok) {
                const rolesData = await rolesRes.json();
                setRoles(Array.isArray(rolesData) ? rolesData : (rolesData.data || []));
            }
            if (catsRes.ok) {
                const catsData = await catsRes.json();
                setCategories(Array.isArray(catsData) ? catsData : (catsData.data || []));
            }
            if (priceRes.ok) {
                const priceData = await priceRes.json();
                setPriceLists(Array.isArray(priceData) ? priceData : (priceData.data || []));
            }

        } catch (error) {
            console.error('Error fetching commissions data:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (slug) fetchAllData();
    }, [slug]);

    const handleSaveRule = async () => {
        if (!formData.name) return toast.error('El nombre es obligatorio');
        setIsSaving(true);
        try {
            const baseUrl = '/api';
            const method = editingRule ? 'PATCH' : 'POST';
            const url = editingRule 
                ? `${baseUrl}/commissions/rules/${editingRule._id}` 
                : `${baseUrl}/commissions/rules`;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...formData, 
                    organizationId: organizationId // Using organizationId from state
                }),
                credentials: 'include'
            });

            if (res.ok) {
                toast.success(editingRule ? 'Regla actualizada' : 'Regla creada');
                setIsRuleModalOpen(false);
                fetchAllData();
            } else {
                throw new Error('Error saving rule');
            }
        } catch (error) {
            toast.error('Error al guardar la regla');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta regla?')) return;
        try {
            const baseUrl = '/api';
            await fetch(`${baseUrl}/commissions/rules/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            toast.success('Regla eliminada');
            fetchAllData();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const openCreate = () => {
        setEditingRule(null);
        setFormData({
            name: '', priority: rules.length, active: true,
            conditions: { roles: [], categories: [], payment_methods: [], price_lists: [] },
            action: { type: 'percentage', base: 'gross', value: 0 },
            scales: []
        });
        setIsRuleModalOpen(true);
    };

    const openEdit = (rule: any) => {
        setEditingRule(rule);
        setFormData({ ...rule });
        setIsRuleModalOpen(true);
    };

    const toggleConditionArray = (key: string, value: string) => {
        setFormData((prev: any) => {
            const current = [...(prev.conditions[key] || [])];
            const index = current.indexOf(value);
            if (index > -1) current.splice(index, 1);
            else current.push(value);
            return {
                ...prev,
                conditions: { ...prev.conditions, [key]: current }
            };
        });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando Comisiones...</p>
        </div>
    );

    return (
        <div className="p-6 max-w-none mx-auto space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <Percent size={20} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            Comisiones
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                            Configura reglas dinámicas y escala de incentivos para tu equipo.
                        </p>
                    </div>
                </div>
            </header>

            <Tabs defaultValue="history" className="space-y-6">
                <TabsList className="mb-6 w-full justify-start h-auto p-1 bg-slate-100 rounded-2xl overflow-x-auto print:hidden border border-slate-200 shadow-inner">
                    <TabsTrigger 
                        value="history" 
                        className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-xs uppercase tracking-wider transition-all duration-300"
                    >
                        <div className="flex items-center gap-2">
                            <History size={16} />
                            HISTORIAL
                        </div>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="rules" 
                        className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-xs uppercase tracking-wider transition-all duration-300"
                    >
                        <div className="flex items-center gap-2">
                            <ShieldEllipsis size={16} />
                            REGLAS DE VENTA
                        </div>
                    </TabsTrigger>
                    <TabsTrigger 
                        value="payments" 
                        className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-xs uppercase tracking-wider transition-all duration-300"
                    >
                        <div className="flex items-center gap-2">
                            <Banknote size={16} />
                            PAGOS
                        </div>
                    </TabsTrigger>
                </TabsList>

                {/* TAB: HISTORY */}
                <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Card className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800">Comisiones Generadas</CardTitle>
                                    <CardDescription>Registro de todas las comisiones calculadas en ventas completadas.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold uppercase text-[10px] tracking-widest">
                                        <Calendar size={14} className="mr-2" /> Filtrar Fecha
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {history.length > 0 ? (
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow className="h-10 text-[10px] uppercase font-black text-slate-400">
                                            <TableHead className="px-6">Vendedor</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Venta ID</TableHead>
                                            <TableHead className="text-right">Monto Venta</TableHead>
                                            <TableHead className="text-right px-6">Comisión</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {history.map((sale) => (
                                            <TableRow key={sale._id} className="h-16 hover:bg-slate-50/50 transition-colors border-slate-100">
                                                <TableCell className="px-6 font-bold text-slate-900 text-xs">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                                            {sale.performed_by?.name?.charAt(0) || 'U'}
                                                        </div>
                                                        {sale.performed_by?.name || 'Sistema'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500">
                                                    {new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                                                    #{sale._id.slice(-6)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-slate-600">
                                                    ${sale.total_amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right px-6">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-green-50 text-green-700 border border-green-100 shadow-sm">
                                                        + ${sale.commission_amount.toLocaleString()}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="p-24 text-center text-slate-400 font-bold uppercase tracking-widest text-xs flex flex-col items-center justify-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-2 border border-slate-200">
                                        <History size={32} />
                                    </div>
                                    <p>No se encontraron comisiones registradas.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: RULES */}
                <TabsContent value="rules" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex justify-between items-center mb-4">
                        <div className="bg-blue-50/50 px-4 py-2 rounded-xl border border-blue-100 text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                            <Settings2 size={14} /> Gestión de Reglas Activas: {rules.length}
                        </div>
                        <Button onClick={openCreate} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-11 tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200">
                            <Plus size={16} className="mr-2" /> Nueva Regla
                        </Button>
                    </div>

                    <div className="grid gap-6">
                        {rules.map((rule) => (
                            <Card key={rule._id} className={cn(
                                "bg-white overflow-hidden shadow-sm transition-all hover:shadow-md border-l-4",
                                rule.active ? "border-l-blue-600" : "border-l-slate-300 opacity-60"
                            )}>
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg">{rule.name}</h3>
                                                {rule.priority === 0 && (
                                                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[9px] font-black uppercase tracking-widest">Alta Prioridad</Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold text-slate-400">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">Prioridad: {rule.priority}</span>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-lg border",
                                                    rule.active ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-200 text-slate-500 border-slate-300"
                                                )}>
                                                    {rule.active ? 'Activa' : 'Pausada'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="icon" onClick={() => openEdit(rule)} className="h-9 w-9 rounded-xl hover:bg-slate-50 border-slate-200">
                                                <Pencil size={14} className="text-slate-600" />
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={() => handleDeleteRule(rule._id)} className="h-9 w-9 rounded-xl hover:bg-red-50 border-slate-200 group">
                                                <Trash2 size={14} className="text-slate-400 group-hover:text-red-500" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                        {/* Conditions Summary */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <Filter size={12} /> Si se cumple:
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {rule.conditions?.roles?.length > 0 && rule.conditions.roles.map((rId: string) => (
                                                    <Badge key={rId} variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">Role: {roles.find(r => r._id === rId)?.name || '...'}</Badge>
                                                ))}
                                                {rule.conditions?.categories?.length > 0 && rule.conditions.categories.map((cId: string) => (
                                                    <Badge key={cId} variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">Categoría: {categories.find(c => c._id === cId)?.name || '...'}</Badge>
                                                ))}
                                                {rule.conditions?.payment_methods?.length > 0 && rule.conditions.payment_methods.map((pm: string) => (
                                                    <Badge key={pm} variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">Pago: {paymentMethods.find(p => p.id === pm)?.name || pm}</Badge>
                                                ))}
                                                {rule.conditions?.price_lists?.length > 0 && rule.conditions.price_lists.map((pl: string) => (
                                                    <Badge key={pl} variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">Lista: {priceLists.find(p => p._id === pl)?.name || pl}</Badge>
                                                ))}
                                                {Object.values(rule.conditions || {}).every((arr: any) => !arr || arr.length === 0) && (
                                                    <span className="text-xs font-bold text-slate-400">Sin condiciones (Aplica a todo)</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Summary */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <Target size={12} /> Entonces aplicar:
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                                                    {rule.action.type === 'percentage' ? <Percent size={18} /> : <DollarSign size={18} />}
                                                </div>
                                                <div>
                                                    <div className="text-lg font-black text-slate-900">
                                                        {rule.action.type === 'percentage' ? `${rule.action.value}%` : `$${rule.action.value}`}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        Sobre {rule.action.base === 'gross' ? 'Total Venta' : 'Utilidad (Neto)'}
                                                    </div>
                                                </div>
                                            </div>
                                            {rule.scales?.length > 0 && (
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    <Badge className="bg-blue-600 text-white border-0 text-[8px] font-black uppercase">+ {rule.scales.length} Escala/s</Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {rules.length === 0 && (
                            <div className="p-24 text-center text-slate-400 font-bold uppercase tracking-widest text-xs flex flex-col items-center justify-center space-y-4 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <ShieldEllipsis size={48} className="text-slate-200 mb-4" />
                                <p>No has creado ninguna regla avanzada de ventas aún.</p>
                                <Button onClick={openCreate} variant="outline" className="mt-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-slate-300 text-slate-600">Crear Mi Primera Regla</Button>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* TAB: PAYMENTS */}
                <TabsContent value="payments" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Card className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <CardContent className="p-24 text-center text-slate-400 font-bold uppercase tracking-widest text-xs flex flex-col items-center justify-center space-y-4">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-2 border border-slate-200">
                                <Banknote size={32} />
                            </div>
                            <p>Próximamente: Liquida y gestiona los pagos de comisiones.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* RULE CONFIG MODAL */}
            <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
                <DialogContent className="max-w-5xl bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden h-[90vh] flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
                        <div>
                            <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900">
                                {editingRule ? 'Editar Regla de Venta' : 'Nueva Regla de Venta'}
                            </DialogTitle>
                            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                Configura los disparadores y beneficios para esta regla dinámica.
                            </DialogDescription>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 min-h-0 bg-white">
                        <div className="p-8 space-y-8 pb-12">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Nombre de la Regla</Label>
                                    <Input 
                                        placeholder="Ej: Promo Efectivo Mostrador" 
                                        className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 focus:bg-white transition-all font-bold uppercase text-xs"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Prioridad (Bajo = Más prioridad)</Label>
                                    <Input 
                                        type="number" 
                                        className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 focus:bg-white transition-all font-bold text-xs"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            {/* CONDITIONS BUILDER */}
                            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                                <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Filter size={14} className="text-blue-600" />
                                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">1. Condiciones (SI SE CUMPLE...)</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                        {/* Roles */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Roles Aplicables</Label>
                                                <Badge variant="outline" className="text-[9px] font-bold text-slate-300 uppercase border-slate-100">Cualquiera</Badge>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                {roles.map(role => (
                                                    <div 
                                                        key={role._id} 
                                                        onClick={() => toggleConditionArray('roles', role._id)}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                                                            formData.conditions.roles.includes(role._id) 
                                                                ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                                                                : "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <span className="text-xs font-bold uppercase">{role.name}</span>
                                                        <Checkbox 
                                                            checked={formData.conditions.roles.includes(role._id)}
                                                            className={cn(
                                                                "h-5 w-5 rounded-md border-2",
                                                                formData.conditions.roles.includes(role._id) ? "border-blue-500 bg-blue-500" : "border-slate-200"
                                                            )}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Categories */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categorías de Producto</Label>
                                            </div>
                                            
                                            {/* Buscador de Categorías */}
                                            <div className="relative group/search">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" size={12} />
                                                <Input 
                                                    placeholder="Buscar categoría..." 
                                                    className="h-9 pl-9 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white text-[10px] font-bold uppercase transition-all"
                                                    value={categorySearch}
                                                    onChange={(e) => setCategorySearch(e.target.value)}
                                                />
                                            </div>

                                            {/* Badges de seleccionadas */}
                                            {formData.conditions.categories.length > 0 && (
                                                <div className="flex flex-wrap gap-2 py-2 border-b border-slate-50">
                                                    {formData.conditions.categories.map((catId: string) => {
                                                        const cat = categories.find(c => c._id === catId);
                                                        return (
                                                            <Badge 
                                                                key={catId} 
                                                                variant="secondary" 
                                                                className="bg-indigo-100 text-indigo-700 hover:bg-red-50 hover:text-red-500 cursor-pointer transition-all border-none font-black text-[9px] uppercase px-3 py-1 rounded-lg flex items-center gap-1 group/badge"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleConditionArray('categories', catId);
                                                                }}
                                                            >
                                                                {cat?.name || 'Cargando...'}
                                                                <X size={10} className="ml-1 opacity-50 group-hover/badge:opacity-100" />
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                {categories
                                                    .filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                                                    .map(cat => (
                                                        <div 
                                                            key={cat._id} 
                                                            onClick={() => toggleConditionArray('categories', cat._id)}
                                                            className={cn(
                                                                "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                                                                formData.conditions.categories.includes(cat._id) 
                                                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm" 
                                                                    : "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                            )}
                                                        >
                                                            <span className="text-xs font-bold uppercase">{cat.name}</span>
                                                            <Checkbox 
                                                                checked={formData.conditions.categories.includes(cat._id)}
                                                                className={cn(
                                                                    "h-5 w-5 rounded-md border-2",
                                                                    formData.conditions.categories.includes(cat._id) ? "border-indigo-500 bg-indigo-500" : "border-slate-200"
                                                                )}
                                                            />
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Payment Methods */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Métodos de Pago</Label>
                                                <Badge variant="outline" className="text-[9px] font-bold text-slate-300 uppercase border-slate-100">Cualquiera</Badge>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {paymentMethods.map(pm => (
                                                    <div 
                                                        key={pm.id} 
                                                        onClick={() => toggleConditionArray('payment_methods', pm.id)}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                                                            formData.conditions.payment_methods.includes(pm.id) 
                                                                ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm" 
                                                                : "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <span className="text-xs font-bold uppercase">{pm.name}</span>
                                                        <Checkbox 
                                                            checked={formData.conditions.payment_methods.includes(pm.id)}
                                                            className={cn(
                                                                "h-5 w-5 rounded-md border-2",
                                                                formData.conditions.payment_methods.includes(pm.id) ? "border-amber-500 bg-amber-500" : "border-slate-200"
                                                            )}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Price Lists */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Listas de Precios</Label>
                                                <Badge variant="outline" className="text-[9px] font-bold text-slate-300 uppercase border-slate-100">Cualquiera</Badge>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                {priceLists.map(pl => (
                                                    <div 
                                                        key={pl._id} 
                                                        onClick={() => toggleConditionArray('price_lists', pl._id)}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group",
                                                            formData.conditions.price_lists.includes(pl._id) 
                                                                ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm" 
                                                                : "bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <span className="text-xs font-bold uppercase">{pl.name}</span>
                                                        <Checkbox 
                                                            checked={formData.conditions.price_lists.includes(pl._id)}
                                                            className={cn(
                                                                "h-5 w-5 rounded-md border-2",
                                                                formData.conditions.price_lists.includes(pl._id) ? "border-emerald-500 bg-emerald-500" : "border-slate-200"
                                                            )}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/5 p-4 rounded-2xl border border-dashed border-slate-200 flex items-start gap-4">
                                        <div className="bg-white p-2 rounded-lg shadow-sm">
                                            <AlertCircle className="text-slate-400" size={16} />
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase">
                                            <span className="text-slate-900">Lógica de Selección:</span> Si no seleccionas nada en un campo, aplicará a todos por igual. Al seleccionar varios elementos, la regla se activará con cualquiera de ellos.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* ACTION BUILDER */}
                            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                                <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Target size={14} className="text-blue-600" />
                                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">2. Beneficio (ENTONCES APLICAR...)</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="space-y-4 text-center md:text-left">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo de Comisión</Label>
                                            <Select value={formData.action.type} onValueChange={(v) => setFormData({ ...formData, action: { ...formData.action, type: v } })}>
                                                <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 focus:bg-white text-xs font-bold uppercase transition-all shadow-none">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                                    <SelectItem value="percentage" className="text-xs font-bold uppercase">Porcentaje (%)</SelectItem>
                                                    <SelectItem value="fixed_amount" className="text-xs font-bold uppercase">Monto Fijo ($)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-4 text-center md:text-left">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Valor del Beneficio</Label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors">
                                                    {formData.action.type === 'percentage' ? <Percent size={14} /> : <DollarSign size={14} />}
                                                </div>
                                                <Input 
                                                    type="number"
                                                    className="h-12 pl-10 rounded-2xl border-slate-200 bg-slate-50/30 focus:bg-white transition-all font-black text-sm text-blue-600 shadow-none"
                                                    value={formData.action.value}
                                                    onChange={(e) => setFormData({ ...formData, action: { ...formData.action, value: parseFloat(e.target.value) } })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4 text-center md:text-left">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Base de Cálculo</Label>
                                            <Select value={formData.action.base} onValueChange={(v) => setFormData({ ...formData, action: { ...formData.action, base: v } })}>
                                                <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 focus:bg-white text-xs font-bold uppercase transition-all shadow-none">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                                    <SelectItem value="gross" className="text-xs font-bold uppercase">Total Bruto (Venta)</SelectItem>
                                                    <SelectItem value="net" className="text-xs font-bold uppercase">Utilidad Neta (Venta - Costo)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* SCALES BUILDER */}
                            <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                                <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Target size={14} className="animate-pulse text-indigo-500" />
                                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">3. Escalas e Incentivos (METAS MENSUALES OPTATIVAS)</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    {formData.scales.map((scale: any, index: number) => (
                                        <div key={index} className="flex flex-col md:flex-row items-center gap-6 bg-indigo-50/30 p-6 rounded-[2rem] border border-indigo-100 group animate-in slide-in-from-right-4 duration-300">
                                            <div className="flex-1 space-y-3 w-full">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-indigo-400 ml-1">Meta de Venta Mensual (Mayor a...)</Label>
                                                <div className="relative group/input">
                                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 group-hover/input:text-indigo-600 transition-colors" size={16} />
                                                    <Input 
                                                        type="number" 
                                                        className="h-12 pl-12 rounded-2xl bg-white border-indigo-200 focus:ring-indigo-500 font-black text-sm shadow-sm"
                                                        value={scale.threshold}
                                                        onChange={(e) => {
                                                            const newScales = [...formData.scales];
                                                            newScales[index].threshold = parseFloat(e.target.value);
                                                            setFormData({ ...formData, scales: newScales });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-center p-2 rounded-full bg-indigo-100/50 text-indigo-400 shrink-0">
                                                <ChevronRight size={20} />
                                            </div>
                                            <div className="flex-1 space-y-3 w-full">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-indigo-400 ml-1">Porcentaje Premio (Sube a...)</Label>
                                                <div className="relative group/input">
                                                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300 group-hover/input:text-indigo-600 transition-colors" size={16} />
                                                    <Input 
                                                        type="number" 
                                                        className="h-12 pl-12 rounded-2xl bg-white border-indigo-200 focus:ring-indigo-500 font-black text-sm text-indigo-700 shadow-sm"
                                                        value={scale.value}
                                                        onChange={(e) => {
                                                            const newScales = [...formData.scales];
                                                            newScales[index].value = parseFloat(e.target.value);
                                                            setFormData({ ...formData, scales: newScales });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                className="rounded-2xl h-12 w-12 bg-white border-indigo-200 text-indigo-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm shrink-0"
                                                onClick={() => {
                                                    const newScales = formData.scales.filter((_: any, i: number) => i !== index);
                                                    setFormData({ ...formData, scales: newScales });
                                                }}
                                            >
                                                <Trash2 size={18} />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        className="w-full h-14 rounded-[2rem] border-dashed border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-400 hover:text-indigo-600 font-black text-[11px] uppercase tracking-widest transition-all shadow-sm"
                                        onClick={() => setFormData({ ...formData, scales: [...formData.scales, { threshold: 0, value: 0 }] })}
                                    >
                                        <Plus size={16} className="mr-2" /> Agregar Nueva Meta de Crecimiento
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-center items-center gap-4 shrink-0">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsRuleModalOpen(false)} 
                            className="rounded-full h-12 px-8 font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-slate-600"
                        >
                            Volver / Cancelar
                        </Button>
                        <Button 
                            onClick={handleSaveRule} 
                            disabled={isSaving}
                            className="bg-slate-900 hover:bg-black text-white h-12 px-12 rounded-full font-black uppercase text-xs shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center gap-3 w-full md:w-auto min-w-[240px]"
                        >
                            {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={18} />}
                            {editingRule ? 'Actualizar Regla Permanente' : 'Guardar Nueva Regla de Venta'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
