'use client';

import React, { useState, useMemo } from 'react';
import {
    Search, Trash2, Truck, Mail, Phone, Plus, Edit, AlertTriangle,
    Globe, ExternalLink, MapPin, Wallet, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SupplierForm } from './supplier-form';
import { useRouter } from 'next/navigation';
import { deleteSupplierAction, deleteSuppliersAction } from './actions';
import { SupplierProductList } from './supplier-product-list';
import { Checkbox } from "@/components/ui/checkbox";
import { CheckingAccountModal } from './checking-account-modal';
import { toast } from 'sonner';
import { supplierService } from '@/services/supplierService';
import { posDB } from '@/lib/pos-db';
import { cn } from "@/lib/utils";
import { WifiOff } from 'lucide-react';

interface Props {
    initialSuppliers: any[];
    initialPagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    categories: any[];
    branches: any[];
    priceLists: any[];
    orgId: string;
    slug: string;
    currentUser: any;
    settings?: any;
}

export function SupplierTableManager({ initialSuppliers, initialPagination, categories, branches, priceLists, orgId, slug, currentUser, settings }: Props) {
    const router = useRouter();

    // Server State
    const [suppliers, setSuppliers] = useState(initialSuppliers);
    const [pagination, setPagination] = useState(initialPagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [debtFilter, setDebtFilter] = useState('all'); // all, debtor, non_debtor
    const [ageFilter, setAgeFilter] = useState('all'); // all, 30, 60, 90

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isMassDeleteOpen, setIsMassDeleteOpen] = useState(false);

    // Debounce Search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination((prev: any) => ({ ...prev, page: 1 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset page when filters change
    React.useEffect(() => {
        setPagination((prev: any) => ({ ...prev, page: 1 }));
    }, [debtFilter]);

    const refreshData = async () => {
        setIsLoading(true);

        // OFFLINE FALLBACK
        if (typeof window !== 'undefined' && !navigator.onLine) {
            const res = await posDB.getPaginatedItems('suppliers', pagination.page, pagination.limit || 50, debouncedSearch);
            setSuppliers(res.data || []);
            setPagination((prev: any) => ({
                ...prev,
                totalPages: Math.ceil(res.total / (prev.limit || 50)),
                total: res.total
            }));
            setIsLoading(false);
            return;
        }

        try {
            const res = await supplierService.getAll(orgId, {
                page: pagination.page,
                limit: pagination.limit || 50,
                search: debouncedSearch,
                debtFilter
            });

            if (res && res.data) {
                const mappedData = res.data.map((s: any) => ({
                    ...s,
                    id: s._id || s.id
                }));
                setSuppliers(mappedData);
                setPagination((prev: any) => ({ ...prev, ...res.pagination }));
                // Sembrar DB local
                if (res.data?.length > 0) posDB.saveSuppliers(res.data);
            }
        } catch (error) {
            console.error("Failed to refresh suppliers", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch Data
    React.useEffect(() => {
        refreshData();
    }, [debouncedSearch, debtFilter, pagination.page, orgId]);

    // Modal States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null); // For Edit
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [selectedAccountSupplier, setSelectedAccountSupplier] = useState<any>(null);

    // Delete States
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedSupplierId, setExpandedSupplierId] = useState<string | null>(null);

    const toggleRowExpansion = (id: string, e: React.MouseEvent) => {
        setExpandedSupplierId(prev => prev === id ? null : id);
    };

    // BULK ACTIONS
    const toggleAllSelection = (checked: boolean) => {
        if (checked) setSelectedIds(new Set(suppliers.map((s: any) => s.id)));
        else setSelectedIds(new Set());
    };

    const toggleRowSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleConfirmMassDelete = async () => {
        setIsDeleting(true);
        const ids = Array.from(selectedIds);
        const res = await deleteSuppliersAction(orgId, slug, ids);
        if (res.success) {
            toast.success(`${ids.length} proveedores eliminados`);
            // Optimistic update? Or refresh
            const newSuppliers = suppliers.filter(s => !selectedIds.has(s.id));
            setSuppliers(newSuppliers);
            if (newSuppliers.length === 0 && pagination.page > 1) {
                setPagination((p: any) => ({ ...p, page: p.page - 1 }));
            } else {
                // Trigger refetch if needed or just wait
            }
            setSelectedIds(new Set());
            setIsMassDeleteOpen(false);
        } else {
            toast.error(res.error);
        }
        setIsDeleting(false);
    };

    const handleSupplierSaved = async () => {
        setIsFormOpen(false);
        setSelectedSupplier(null);
        // Trigger fetch via search param slightly hacky or just rely on manual refresh
        // Better: trigger fetch
        const res = await supplierService.getAll(orgId, {
            page: pagination.page,
            limit: pagination.limit,
            search: debouncedSearch,
            debtFilter
        });
        if (res && res.data) {
            setSuppliers(res.data.map((s: any) => ({ ...s, id: s._id || s.id })));
            setPagination((prev: any) => ({ ...prev, ...res.pagination }));
        }
        router.refresh();
    };

    const handleConfirmDelete = async () => {
        if (!supplierToDelete) return;
        setIsDeleting(true);
        const res = await deleteSupplierAction(orgId, slug, supplierToDelete.id);
        if (res.success) {
            toast.success("Proveedor eliminado");
            setSuppliers(suppliers.filter(s => s.id !== supplierToDelete.id));
            setIsDeleteDialogOpen(false);
        } else {
            toast.error(res.error);
        }
        setIsDeleting(false);
    };

    const SocialLink = ({ href, icon: Icon, colorClass }: { href: string, icon: any, colorClass: string }) => {
        if (!href) return null;
        // Ensure href has protocol
        const fullHref = href.startsWith('http') ? href : `https://${href}`;
        return (
            <a
                href={fullHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${colorClass}`}
                onClick={(e) => e.stopPropagation()}
            >
                <Icon size={16} />
            </a>
        );
    };

    const getVencimientoInfo = (lastDebtDate: string | Date | undefined, balance: number) => {
        if (!lastDebtDate || balance <= 0) return { days: '-', color: 'text-slate-300' };

        const start = new Date(lastDebtDate);
        const today = new Date();
        start.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const remaining = 30 - diffDays;

        let color = 'text-emerald-500 font-bold';
        if (remaining <= 5 && remaining >= 0) color = 'text-orange-500 font-black';
        if (remaining < 0) color = 'text-red-600 font-black';

        return { days: remaining, color };
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    const canViewAccount = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
        const rolePerms = currentUser.roleId?.permissions || [];
        const modulePerms = rolePerms.find((p: any) => p.module === 'suppliers');
        // Check for 'balances' tab specifically
        const tab = modulePerms?.tabs?.find((t: any) => t.name === 'balances');
        return !!tab?.enabled;
    }, [currentUser]);

    const canCreate = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
        const rolePerms = currentUser.roleId?.permissions || [];
        const modulePerms = rolePerms.find((p: any) => p.module === 'suppliers');
        return !!modulePerms?.create;
    }, [currentUser]);

    const canEdit = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
        const rolePerms = currentUser.roleId?.permissions || [];
        const modulePerms = rolePerms.find((p: any) => p.module === 'suppliers');
        return !!modulePerms?.edit;
    }, [currentUser]);

    const canDelete = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
        const rolePerms = currentUser.roleId?.permissions || [];
        const modulePerms = rolePerms.find((p: any) => p.module === 'suppliers');
        return !!modulePerms?.delete;
    }, [currentUser]);

    // Instagram Icon (Custom SVG or Lucide if available, using simple text or generic icon if needed)
    // Lucide has 'Instagram' in newer versions, using generic or text for now if not available or just rely on Lucide
    // Assuming Lucide is installed:
    const InstagramIcon = (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
    );
    const TikTokIcon = (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>
    );


    return (
        <div className="w-full space-y-4">
            {/* INDICADOR OFFLINE */}
            {isMounted && !navigator.onLine && (
                <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl flex items-center gap-2 mb-2 animate-pulse">
                    <WifiOff size={14} className="text-amber-500" />
                    <span className="text-[10px] font-black text-amber-600 uppercase">Consulta Offline - Datos locales</span>
                </div>
            )}
            {/* TOOLBAR */}
            <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 flex-1 max-w-xl">
                    <div className="px-3 h-9 bg-slate-200 rounded-lg flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase border border-slate-300">
                        <Search size={14} /> BUSCAR
                    </div>
                    <Input
                        placeholder="Nombre, DNI, Email..."
                        className="bg-transparent border-0 focus-visible:ring-0 text-slate-900 text-sm h-9 shadow-none flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* FILTERS */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Filter size={10} /> Estado:</div>
                    <Select value={debtFilter} onValueChange={setDebtFilter}>
                        <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[110px] shadow-sm focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[110px]">
                            <SelectItem value="all" className="text-[10px] uppercase font-bold">Todos</SelectItem>
                            <SelectItem value="debtor" className="text-[10px] uppercase font-bold text-red-600">Deudores</SelectItem>
                            <SelectItem value="non_debtor" className="text-[10px] uppercase font-bold text-green-600">Al Día</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* FILTER: ANTIGÜEDAD */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Filter size={10} /> Vencimiento:</div>
                    <Select value={ageFilter} onValueChange={setAgeFilter}>
                        <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[120px] shadow-sm focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Vencimiento" />
                        </SelectTrigger>
                        <SelectContent className="min-w-[120px]">
                            <SelectItem value="all" className="text-[10px] uppercase font-bold">Todos</SelectItem>
                            <SelectItem value="30" className="text-[10px] uppercase font-bold">+ 30 Días</SelectItem>
                            <SelectItem value="60" className="text-[10px] uppercase font-bold">+ 60 Días</SelectItem>
                            <SelectItem value="90" className="text-[10px] uppercase font-bold">+ 90 Días</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2 ml-auto items-center">
                    {selectedIds.size > 0 && canDelete && (
                        <Button variant="destructive" size="sm" className="h-9 rounded-xl text-[10px] font-black uppercase px-4 mr-2" onClick={() => setIsMassDeleteOpen(true)}>
                            <Trash2 size={14} className="mr-2" /> Borrar ({selectedIds.size})
                        </Button>
                    )}
                    {canCreate && (
                        <Button onClick={() => { setSelectedSupplier(null); setIsFormOpen(true); }} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl">
                            <Plus size={16} className="mr-2" /> Nuevo Proveedor
                        </Button>
                    )}
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/80 h-10">
                        <TableRow className="text-[10px] uppercase font-black border-slate-200 hover:bg-transparent">
                            <TableHead className="w-12 text-center">
                                {canDelete && (
                                    <Checkbox
                                        checked={selectedIds.size === suppliers.length && suppliers.length > 0}
                                        onCheckedChange={toggleAllSelection}
                                    />
                                )}
                            </TableHead>
                            <TableHead className="w-14 text-center">Avatar</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Dirección</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Redes & Web</TableHead>
                            <TableHead className="text-right">
                                {canViewAccount && "Saldo"}
                            </TableHead>
                            <TableHead className="text-center">Vencimiento</TableHead>
                            <TableHead className="text-right w-[90px] px-2">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!isLoading && suppliers.map((s) => (
                            <React.Fragment key={s.id}>
                                <TableRow
                                    className={`border-slate-100 h-16 hover:bg-slate-50 transition-colors cursor-pointer ${expandedSupplierId === s.id ? "bg-slate-50" : ""}`}
                                    onClick={(e) => toggleRowExpansion(s.id, e)}
                                >
                                    <TableCell className="text-center p-4">
                                        {canDelete && (
                                            <Checkbox
                                                checked={selectedIds.has(s.id)}
                                                onCheckedChange={() => toggleRowSelection(s.id)}
                                                // Stop propagation to prevent row expansion
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center p-4">
                                        {s.image_url ? (
                                            <div className="w-10 h-10 rounded-full overflow-hidden mx-auto border border-slate-200">
                                                <img
                                                    src={s.image_url}
                                                    alt={s.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                                                <Truck size={18} />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="p-4 font-mono text-xs font-bold text-slate-500">
                                        {s.code || '-'}
                                    </TableCell>
                                    <TableCell className="p-4">
                                        <div className="font-bold text-slate-900">{s.name}</div>
                                        <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-medium mt-1">
                                            {s.tax_id && <span>DNI/CUIT: {s.tax_id}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-4">
                                        <div className="flex flex-col gap-1 text-xs text-slate-500">
                                            {(s.phones && s.phones.length > 0) ? (
                                                <div className="flex items-center gap-1">
                                                    <a
                                                        href={`https://wa.me/${s.phones[0].number.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex items-center gap-1 hover:text-green-600 transition-colors"
                                                    >
                                                        <Phone size={12} />
                                                        <span>{s.phones[0].number}</span>
                                                    </a>
                                                    {s.phones.length > 1 && <span className="text-[9px] bg-slate-100 px-1 rounded-full text-slate-400">+{s.phones.length - 1}</span>}
                                                </div>
                                            ) : (
                                                s.phone ? (
                                                    <a
                                                        href={`https://wa.me/${s.phone.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex items-center gap-1 hover:text-green-600 transition-colors"
                                                    >
                                                        <Phone size={12} /> {s.phone}
                                                    </a>
                                                ) : <span className="text-[10px] text-slate-300 italic">-</span>
                                            )}
                                            {s.contact_name && <div className="text-[10px] text-slate-400 italic">Ref: {s.contact_name}</div>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-4">
                                        {s.addresses && s.addresses.length > 0 ? (
                                            <div className="flex items-center gap-1 text-slate-600 text-[10px]">
                                                <MapPin size={10} />
                                                <span>{s.addresses[0].street} {s.addresses[0].city ? `, ${s.addresses[0].city}` : ''}</span>
                                                {s.addresses.length > 1 && <span className="text-[9px] bg-slate-100 px-1 rounded-full text-slate-400">+{s.addresses.length - 1}</span>}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-300 italic">Sin dirección</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="p-4">
                                        <div className="flex flex-col gap-1 text-xs text-slate-500">
                                            {(s.emails && s.emails.length > 0) ? (
                                                <div className="flex items-center gap-1">
                                                    <Mail size={12} />
                                                    <span>{s.emails[0].email}</span>
                                                    {s.emails.length > 1 && <span className="text-[9px] bg-slate-100 px-1 rounded-full text-slate-400">+{s.emails.length - 1}</span>}
                                                </div>
                                            ) : (
                                                s.email ? <div className="flex items-center gap-1"><Mail size={12} /> {s.email}</div> : <span className="text-[10px] text-slate-300 italic">-</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-4">
                                        <div className="flex items-center gap-1">
                                            {s.web_url ? <SocialLink href={s.web_url} icon={Globe} colorClass="text-blue-500" /> : null}
                                            {s.instagram ? <SocialLink href={`https://instagram.com/${s.instagram.replace('@', '')}`} icon={InstagramIcon} colorClass="text-pink-600" /> : null}
                                            {s.tiktok ? <SocialLink href={`https://tiktok.com/@${s.tiktok.replace('@', '')}`} icon={TikTokIcon} colorClass="text-black" /> : null}
                                            {!s.web_url && !s.instagram && !s.tiktok && <span className="text-[10px] text-slate-300">-</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-4 text-right">
                                        {canViewAccount ? (
                                            <span className={cn("font-bold", s.credit_balance > 0 ? "text-red-600" : "text-emerald-600")}>
                                                {formatMoney(s.credit_balance || 0)}
                                            </span>
                                        ) : (
                                            <span className="text-slate-200 text-[10px] italic">Oculto</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="p-4 text-center">
                                        {(() => {
                                            const { days, color } = getVencimientoInfo(s.last_debt_date, s.credit_balance);
                                            return (
                                                <div className={cn("text-sm", color)}>
                                                    {days}
                                                </div>
                                            );
                                        })()}
                                    </TableCell>
                                    <TableCell className="text-right w-[90px] px-2">
                                        <div className="flex items-center justify-end gap-1">
                                            {s.has_active_account && canViewAccount && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedAccountSupplier(s); setIsAccountModalOpen(true); }}
                                                    className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all rounded-lg"
                                                    title="Cuenta Corriente"
                                                >
                                                    <span className="font-bold text-xs"><Wallet className="w-4 h-4" /></span>
                                                </Button>
                                            )}
                                            {canEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedSupplier(s); setIsFormOpen(true); }}
                                                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg"
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                            )}

                                            {canDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => { e.stopPropagation(); setSupplierToDelete(s); setIsDeleteDialogOpen(true); }}
                                                    className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-red-50 transition-all rounded-lg"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                                {expandedSupplierId === s.id && (
                                    <TableRow className="bg-slate-50 border-none hover:bg-slate-50">
                                        <TableCell colSpan={10} className="p-0 border-t-0">
                                            <div className="px-12 py-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <SupplierProductList
                                                    orgId={orgId}
                                                    slug={slug}
                                                    supplierId={s.id}
                                                    categories={categories}
                                                    branches={branches}
                                                    priceLists={priceLists}
                                                    suppliers={suppliers}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))}
                        {!isLoading && suppliers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} className="h-48 text-center py-10">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <p className="text-xs text-slate-500 font-bold uppercase">No se encontraron proveedores.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={10} className="h-48 text-center py-10">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <p className="text-xs text-slate-500 font-bold uppercase animate-pulse">Cargando proveedores...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* PAGINATION CONTROLS */}
            <div className="flex items-center justify-between p-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Mostrando {(pagination.page - 1) * pagination.limit + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} proveedores (Página {pagination.page} de {pagination.totalPages})
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination((prev: any) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={pagination.page === 1 || isLoading}
                        className="h-8 w-8 p-0 rounded-lg text-slate-500"
                    >
                        <ChevronLeft size={14} />
                    </Button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pNum = i + 1;
                            if (pagination.totalPages > 5 && pagination.page > 3) pNum = pagination.page - 2 + i;
                            if (pNum > pagination.totalPages) return null;
                            if (pNum < 1) return null;

                            return (
                                <Button
                                    key={pNum}
                                    variant={pagination.page === pNum ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setPagination((prev: any) => ({ ...prev, page: pNum }))}
                                    disabled={isLoading}
                                    className={cn("h-8 w-8 p-0 rounded-lg text-[10px] font-black", pagination.page === pNum ? "bg-slate-900 text-white" : "text-slate-500")}
                                >
                                    {pNum}
                                </Button>
                            );
                        })}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination((prev: any) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                        disabled={pagination.page >= pagination.totalPages || isLoading}
                        className="h-8 w-8 p-0 rounded-lg text-slate-500"
                    >
                        <ChevronRight size={14} />
                    </Button>
                </div>
            </div>

            {/* ADD/EDIT MODAL */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden h-[90vh] flex flex-col">
                    <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">
                            {selectedSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                        </DialogTitle>
                        <DialogDescription className="hidden">
                            Formulario para gestionar proveedores
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-0 overflow-hidden grow flex flex-col">
                        <SupplierForm
                            key={selectedSupplier?.id || 'new'}
                            orgId={orgId}
                            slug={slug}
                            initialData={selectedSupplier}
                            categories={categories}
                            onSuccess={handleSupplierSaved}
                            onCancel={() => setIsFormOpen(false)}
                            settings={settings}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMATION */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Eliminar Proveedor?</DialogTitle>
                        <DialogDescription className="text-center text-slate-500">
                            Confirmar acción de eliminación
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-destructive">
                            <AlertTriangle size={32} />
                        </div>
                        <p className="text-sm text-slate-500">
                            Esta acción no se puede deshacer.
                        </p>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="rounded-xl h-12 font-bold uppercase text-[10px]">Cancelar</Button>
                            <Button onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive text-white rounded-xl h-12 font-black uppercase text-[10px]">
                                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MASS DELETE DIALOG */}
            <Dialog open={isMassDeleteOpen} onOpenChange={setIsMassDeleteOpen}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Eliminar Selección?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-destructive">
                            <Trash2 size={32} />
                        </div>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button variant="outline" onClick={() => setIsMassDeleteOpen(false)} className="rounded-xl h-12 font-bold uppercase text-[10px]">Cancelar</Button>
                            <Button onClick={handleConfirmMassDelete} disabled={isDeleting} className="bg-destructive text-white rounded-xl h-12 font-black uppercase text-[10px]">Eliminar Todo</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* CHECKING ACCOUNT MODAL */}
            {
                selectedAccountSupplier && (
                    <CheckingAccountModal
                        isOpen={isAccountModalOpen}
                        onClose={(finalBalance) => {
                            setIsAccountModalOpen(false);
                            const lastSupplier = selectedAccountSupplier;
                            setSelectedAccountSupplier(null);

                            // Optimized local update instead of full refreshData()
                            if (finalBalance !== undefined && lastSupplier) {
                                setSuppliers(prev => prev.map(s =>
                                    s.id === lastSupplier.id ? { ...s, credit_balance: finalBalance } : s
                                ));
                            }
                        }}
                        supplier={selectedAccountSupplier}
                        orgId={orgId}
                        account={null} // Loaded internally
                        slug={slug}
                    />
                )
            }
        </div >
    );
}
