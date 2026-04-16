'use client';

import React, { useState, useMemo } from 'react';
import {
    Search, Trash2, User, Mail, Phone, ExternalLink, Plus, Edit, AlertTriangle, Filter, ChevronLeft, ChevronRight, WifiOff
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerForm } from './customer-form';
import { CheckingAccountModal } from './checking-account-modal';
import { deleteCustomerAction, deleteCustomersAction } from './actions';
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';
import { customerService } from '@/services/customerService';
import { posDB } from '@/lib/pos-db';

interface Props {
    initialCustomers: any[];
    initialPagination?: any;
    orgId: string;
    slug: string;
    currentUser: any;
    settings?: any;
}

export function CustomerTableManager({ initialCustomers, initialPagination, orgId, slug, currentUser, settings }: Props) {
    // Server State
    const [customers, setCustomers] = useState(initialCustomers);
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

    // Modal States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null); // For Edit
    const [selectedCustomerForAccount, setSelectedCustomerForAccount] = useState<any>(null);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    // Delete States
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Refresh Trigger
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Debounce Search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination((prev: any) => ({ ...prev, page: 1 })); // Reset to page 1 on search
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset page when filters change
    React.useEffect(() => {
        setPagination((prev: any) => ({ ...prev, page: 1 }));
    }, [debtFilter, ageFilter]);

    // Fetch Data (Server Side or Offline Fallback)
    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);

            // OFFLINE FALLBACK
            if (typeof window !== 'undefined' && !navigator.onLine) {
                const res = await posDB.getPaginatedItems('customers', pagination.page, pagination.limit || 50, debouncedSearch);
                setCustomers(res.data || []);
                setPagination((prev: any) => ({
                    ...prev,
                    totalPages: Math.ceil(res.total / (prev.limit || 50)),
                    total: res.total
                }));
                setIsLoading(false);
                return;
            }

            try {
                const res = await customerService.getAll(orgId, {
                    page: pagination.page,
                    limit: pagination.limit || 50,
                    search: debouncedSearch,
                    debtFilter
                });

                if (res && res.data) {
                    setCustomers(res.data);
                    setPagination((prev: any) => ({ ...prev, ...res.pagination }));
                    // Sembrar DB local
                    if (res.data?.length > 0) posDB.saveCustomers(res.data);
                }
            } catch (error) {
                console.error("Failed to fetch customers", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [debouncedSearch, debtFilter, ageFilter, pagination.page, refreshTrigger]);


    // Client-side visual filtering for Age (optional, as it was in the original code)
    // We will map 'customers' directly, but if age filter is applied, we visually hide/filter them 
    // from the CURRENT page. Ideally this should be backend, but for now we follow the plan.
    const displayedCustomers = useMemo(() => {
        return customers.filter((c: any) => {
            // 3. Age Filter (Only applies if there's debt date)
            let matchesAge = true;
            if (ageFilter !== 'all' && c.last_debt_date && c.credit_balance > 0) {
                const start = new Date(c.last_debt_date);
                const today = new Date();
                start.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);
                const diffTime = today.getTime() - start.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const threshold = parseInt(ageFilter);
                matchesAge = diffDays >= threshold;
            } else if (ageFilter !== 'all') {
                matchesAge = false;
            }
            return matchesAge;
        });
    }, [customers, ageFilter]);

    const handleCustomerSaved = () => {
        setIsFormOpen(false);
        setSelectedCustomer(null);
        window.location.reload();
    };

    const handleConfirmDelete = async () => {
        if (!customerToDelete) return;
        setIsDeleting(true);
        const res = await deleteCustomerAction(orgId, slug, customerToDelete.id);
        if (res.success) {
            toast.success("Cliente eliminado");
            setCustomers(customers.filter(c => c.id !== customerToDelete.id));
            setIsDeleteDialogOpen(false);
        } else {
            toast.error(res.error);
        }
        setIsDeleting(false);
    };

    // BULK ACTIONS
    const toggleAllSelection = (checked: boolean) => {
        if (checked) setSelectedIds(new Set(displayedCustomers.map((c: any) => c.id)));
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
        const res = await deleteCustomersAction(orgId, slug, ids);
        if (res.success) {
            toast.success(`${ids.length} clientes eliminados`);
            setCustomers(customers.filter(c => !selectedIds.has(c.id)));
            setSelectedIds(new Set());
            setIsMassDeleteOpen(false);
        } else {
            toast.error(res.error);
        }
        setIsDeleting(false);
    };

    const openAccountModal = (customer: any) => {
        setSelectedCustomerForAccount(customer);
        setIsAccountModalOpen(true);
    };

    const getVencimientoInfo = (lastDebtDate: string | Date | undefined, balance: number) => {
        if (!lastDebtDate || balance <= 0) return { days: '-', color: 'text-slate-300' };

        const start = new Date(lastDebtDate);
        const today = new Date();
        // Reset hours to compare only days
        start.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const remaining = 30 - diffDays;

        let color = 'text-emerald-500 font-bold'; // Green > 5
        if (remaining <= 5 && remaining >= 0) color = 'text-orange-500 font-black'; // Orange 0-5
        if (remaining < 0) color = 'text-red-600 font-black'; // Red < 0

        return { days: remaining, color };
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    const canViewAccount = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
        const rolePerms = currentUser.roleId?.permissions || [];
        const modulePerms = rolePerms.find((p: any) => p.module === 'customers');
        // Check for 'balances' tab specifically
        const tab = modulePerms?.tabs?.find((t: any) => t.name === 'balances');
        return !!tab?.enabled;
    }, [currentUser]);

    const canCreate = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
        const rolePerms = currentUser.roleId?.permissions || [];
        const modulePerms = rolePerms.find((p: any) => p.module === 'customers');
        return !!modulePerms?.create;
    }, [currentUser]);

    const canEdit = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
        const rolePerms = currentUser.roleId?.permissions || [];
        const modulePerms = rolePerms.find((p: any) => p.module === 'customers');
        return !!modulePerms?.edit;
    }, [currentUser]);

    const canDelete = useMemo(() => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin' || currentUser.role === 'superadmin') return true;
        const rolePerms = currentUser.roleId?.permissions || [];
        const modulePerms = rolePerms.find((p: any) => p.module === 'customers');
        return !!modulePerms?.delete;
    }, [currentUser]);

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
                        placeholder="Nombre, DNI o Email..."
                        className="bg-transparent border-0 focus-visible:ring-0 text-slate-900 text-sm h-9 shadow-none flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* FILTER: ESTADO (DEUDA) */}
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
                        <Button onClick={() => { setSelectedCustomer(null); setIsFormOpen(true); }} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl">
                            <Plus size={16} className="mr-2" /> Nuevo Cliente
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
                                        checked={selectedIds.size === displayedCustomers.length && displayedCustomers.length > 0}
                                        onCheckedChange={toggleAllSelection}
                                    />
                                )}
                            </TableHead>
                            {!settings?.disabled_tabs?.includes('avatar') && <TableHead className="w-14 text-center">Avatar</TableHead>}
                            <TableHead>Código</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Contacto</TableHead>
                            <TableHead>Dirección</TableHead>
                            <TableHead>DNI/CUIT</TableHead>
                            <TableHead className="text-right">
                                {canViewAccount && "Saldo"}
                            </TableHead>
                            <TableHead className="text-center">Vencimiento</TableHead>
                            <TableHead className="text-right px-6">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!isLoading && displayedCustomers.map((customer) => (
                            <TableRow
                                key={customer.id}
                                className="h-16 hover:bg-slate-50 transition-colors group"
                            >
                                <TableCell className="w-10 pl-4">
                                    {canDelete && (
                                        <Checkbox
                                            checked={selectedIds.has(customer.id)}
                                            onCheckedChange={() => toggleRowSelection(customer.id)}
                                            className="border-slate-300 data-[state=checked]:bg-slate-900"
                                        />
                                    )}
                                </TableCell>
                                {!settings?.disabled_tabs?.includes('avatar') && (
                                    <TableCell className="text-center p-4">
                                        {customer.image_url ? (
                                            <div className="w-10 h-10 rounded-full overflow-hidden mx-auto border border-slate-200">
                                                <img
                                                    src={customer.image_url}
                                                    alt={customer.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                                                <User size={18} />
                                            </div>
                                        )}
                                    </TableCell>
                                )}
                                <TableCell className="p-4 font-mono text-xs font-bold text-slate-500">
                                    {customer.code || '-'}
                                </TableCell>
                                <TableCell className="p-4">
                                    <div className="font-bold text-slate-900">{customer.name}</div>
                                </TableCell>
                                <TableCell className="p-4">
                                    <div className="flex flex-col gap-1 text-xs text-slate-500">
                                        {customer.email && <div className="flex items-center gap-1"><Mail size={12} /> {customer.email}</div>}
                                        {customer.phone && (
                                            <a
                                                href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center gap-1 hover:text-green-600 transition-colors"
                                            >
                                                <Phone size={12} /> {customer.phone}
                                            </a>
                                        )}
                                        {!customer.email && !customer.phone && '-'}
                                    </div>
                                </TableCell>
                                <TableCell className="p-4 text-xs text-slate-500 max-w-[200px] truncate" title={customer.address}>
                                    {customer.address ? (
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700">{customer.address}</span>
                                            {(customer.city || customer.province) && (
                                                <span className="text-[10px] text-slate-400">
                                                    {[customer.city, customer.province].filter(Boolean).join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    ) : '-'}
                                </TableCell>
                                <TableCell className="p-4 text-xs font-mono text-slate-500">
                                    {customer.doc_number || '-'}
                                </TableCell>
                                <TableCell className="p-4 text-right">
                                    {canViewAccount ? (
                                        <span className={cn("font-bold", customer.credit_balance > 0 ? "text-red-600" : "text-emerald-600")}>
                                            {formatMoney(customer.credit_balance || 0)}
                                        </span>
                                    ) : (
                                        <span className="text-slate-200 text-[10px] italic">Oculto</span>
                                    )}
                                </TableCell>
                                <TableCell className="p-4 text-center">
                                    {(() => {
                                        const { days, color } = getVencimientoInfo(customer.last_debt_date, customer.credit_balance);
                                        return (
                                            <div className={cn("text-sm", color)}>
                                                {days}
                                            </div>
                                        );
                                    })()}
                                </TableCell>
                                <TableCell className="p-4 text-right px-6">
                                    <div className="flex items-center justify-end gap-2">
                                        {/* Wallet Icon - Active ONLY if account is active AND user has permission */}
                                        {customer.has_active_account && canViewAccount && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => { e.stopPropagation(); openAccountModal(customer); }}
                                                className="h-8 w-8 text-slate-400 hover:text-green-600 hover:bg-green-50 transition-all"
                                                title="Cuenta Corriente Activa"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wallet"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></svg>
                                            </Button>
                                        )}
                                        {/* Edit Button */}
                                        {canEdit && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); setIsFormOpen(true); }}
                                                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                            >
                                                <Edit size={16} />
                                            </Button>
                                        )}

                                        {/* Delete Button */}
                                        {canDelete && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => { e.stopPropagation(); setCustomerToDelete(customer); setIsDeleteDialogOpen(true); }}
                                                className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-red-50 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && displayedCustomers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-48 text-center py-10">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <p className="text-xs text-slate-500 font-bold uppercase">No se encontraron clientes.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-48 text-center py-10">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        {/* Assuming Loader2 is imported or available, otherwise use text */}
                                        <p className="text-xs text-slate-500 font-bold uppercase animate-pulse">Cargando clientes...</p>
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
                    Mostrando {(pagination.page - 1) * pagination.limit + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} clientes (Página {pagination.page} de {pagination.totalPages})
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

            {/* ADD/EDIT CUSTOMER DIALOG */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden h-[90vh] flex flex-col">
                    <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">
                            {selectedCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-0 overflow-hidden grow flex flex-col">
                        <CustomerForm
                            key={selectedCustomer?.id || 'new'} // Force re-render on customer change
                            orgId={orgId}
                            slug={slug}
                            initialData={selectedCustomer}
                            onSuccess={handleCustomerSaved}
                            onCancel={() => setIsFormOpen(false)}
                            settings={settings}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMATION DIALOG (Styled like Inventory/Sales) */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Eliminar Cliente?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-destructive">
                            <AlertTriangle size={32} />
                        </div>
                        <p className="text-sm text-slate-500">
                            Esta acción no se puede deshacer. Se eliminará también su cuenta corriente.
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
                selectedCustomerForAccount && (
                    <CheckingAccountModal
                        isOpen={isAccountModalOpen}
                        onClose={(finalBalance) => {
                            setIsAccountModalOpen(false);
                            const lastCustomer = selectedCustomerForAccount;
                            setSelectedCustomerForAccount(null);

                            // Optimized local update instead of full refresh
                            if (finalBalance !== undefined && lastCustomer) {
                                setCustomers(prev => prev.map(c =>
                                    c.id === lastCustomer.id ? { ...c, credit_balance: finalBalance } : c
                                ));
                            }
                        }}
                        customer={selectedCustomerForAccount}
                        orgId={orgId}
                        account={selectedCustomerForAccount?.account}
                        slug={slug}
                    />
                )
            }
        </div >
    );
}
