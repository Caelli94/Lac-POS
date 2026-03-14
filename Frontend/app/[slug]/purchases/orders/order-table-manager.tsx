'use client';

import React, { useState, useMemo } from 'react';
import {
    Search, Trash2, Plus, Edit, AlertTriangle,
    Filter, Package, Calendar, User
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderForm } from './order-form';
import { useRouter } from 'next/navigation';
import { deleteOrderAction, updateOrderAction } from './actions';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
    initialOrders: any[];
    customers: any[];
    orgId: string;
    slug: string;
    currentUser: any;
    canEdit?: boolean;
    canDelete?: boolean;
}

const statusMap: Record<string, { label: string, color: string, bg: string }> = {
    'PENDING': { label: 'Pendiente', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    'ORDERED': { label: 'Pedido', color: 'text-blue-600', bg: 'bg-blue-50' },
    'ARRIVED': { label: 'Recibido', color: 'text-purple-600', bg: 'bg-purple-50' },
    'DELIVERED': { label: 'Entregado', color: 'text-green-600', bg: 'bg-green-50' },
    'CANCELLED': { label: 'Cancelado', color: 'text-slate-500', bg: 'bg-slate-100' },
};

export function OrderTableManager({ initialOrders, customers, orgId, slug, currentUser, canEdit, canDelete }: Props) {
    const router = useRouter();
    const [orders, setOrders] = useState(initialOrders);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Sync state with server data (if revalidated)
    React.useEffect(() => {
        setOrders(initialOrders);
    }, [initialOrders]);

    // Modals
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filtering
    const filteredOrders = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return orders.filter((o: any) => {
            const matchesSearch =
                (o.product_name && o.product_name.toLowerCase().includes(term)) ||
                (o.customer?.name && o.customer.name.toLowerCase().includes(term)) ||
                (o.customer_name && o.customer_name.toLowerCase().includes(term)) ||
                (o.details && o.details.toLowerCase().includes(term));

            if (!matchesSearch) return false;

            if (statusFilter !== 'all' && o.status !== statusFilter) return false;

            return true;
        });
    }, [orders, searchTerm, statusFilter]);

    const handleSuccess = () => {
        setIsFormOpen(false);
        setSelectedOrder(null);
        router.refresh(); // Refresh Data
    };

    const handleConfirmDelete = async () => {
        if (!orderToDelete) return;
        setIsDeleting(true);
        const res = await deleteOrderAction(orderToDelete.id || orderToDelete._id, slug);
        if (res.success) {
            toast.success("Pedido eliminado");
            setOrders(orders.filter(o => (o.id || o._id) !== (orderToDelete.id || orderToDelete._id)));
            setIsDeleteDialogOpen(false);
        } else {
            toast.error(res.error);
        }
        setIsDeleting(false);
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    return (
        <div className="w-full space-y-4">
            {/* TOOLBAR */}
            <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 flex-1 max-w-xl">
                    <div className="px-3 h-9 bg-slate-200 rounded-lg flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase border border-slate-300">
                        <Search size={14} /> BUSCAR
                    </div>
                    <Input
                        placeholder="Producto, Cliente, Notas..."
                        className="bg-transparent border-0 focus-visible:ring-0 text-slate-900 text-sm h-9 shadow-none flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Filter size={10} /> Estado:</div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[130px] shadow-sm focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">TODOS</SelectItem>
                            {Object.entries(statusMap).map(([key, conf]) => (
                                <SelectItem key={key} value={key} className="uppercase text-[10px] font-bold">{conf.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2 ml-auto items-center">
                    {canEdit && (
                        <Button onClick={() => { setSelectedOrder(null); setIsFormOpen(true); }} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl">
                            <Plus size={16} className="mr-2" /> Nuevo Encargue
                        </Button>
                    )}
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/80 h-10">
                        <TableRow className="text-[10px] uppercase font-black border-slate-200 hover:bg-transparent">
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-center">Operador</TableHead>
                            <TableHead className="text-center">Fecha Est.</TableHead>
                            <TableHead className="text-right">Seña</TableHead>
                            <TableHead className="text-right px-6">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.map((order, index) => {
                            const status = statusMap[order.status] || statusMap['PENDING'];
                            return (
                                <TableRow key={order.id || order._id} className="h-16 hover:bg-slate-50 transition-colors group">
                                    <TableCell className="text-center text-xs font-mono text-slate-400 font-bold">
                                        {(filteredOrders.length - index).toString().padStart(2, '0')}
                                    </TableCell>
                                    <TableCell className="p-4">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border",
                                            status.bg, status.color, "border-current/10"
                                        )}>
                                            {status.label}
                                        </span>
                                    </TableCell>
                                    <TableCell className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                                                <Package size={16} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">{order.product_name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded font-mono font-bold">x{order.quantity}</span>
                                                    {order.details && <span className="text-[10px] text-slate-400 italic truncate max-w-[200px]">{order.details}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-4">
                                        <div className="flex items-center gap-2 text-slate-600 font-medium text-xs">
                                            <User size={14} className="text-slate-400" />
                                            {order.customer?.name || order.customer_name || <span className="text-slate-300 italic">Cliente Eliminado</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-4">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-bold text-slate-700 uppercase px-2 py-1 bg-slate-50 rounded border border-slate-100 w-fit">
                                                {order.performed_by?.name || 'Sistema'}
                                            </span>
                                            {order.performed_by?.role && (
                                                <span className="text-[9px] font-black text-slate-400 uppercase mt-0.5 italic tracking-widest leading-none">
                                                    {order.performed_by.role === 'admin' ? 'Administrador' : order.performed_by.role}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-4 text-center">
                                        {order.expected_date ? (
                                            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 py-1 px-2 rounded-lg border border-slate-100 inline-flex">
                                                <Calendar size={12} className="text-slate-400" />
                                                {format(new Date(order.expected_date), 'dd MMM', { locale: es })}
                                            </div>
                                        ) : <span className="text-slate-300 text-[10px]">-</span>}
                                    </TableCell>
                                    <TableCell className="p-4 text-right">
                                        {order.deposit_amount > 0 ? (
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-emerald-600 text-xs">
                                                    {formatMoney(order.deposit_amount)}
                                                </span>
                                                {order.payment_method && (
                                                    <span className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">
                                                        {order.payment_method}
                                                    </span>
                                                )}
                                            </div>
                                        ) : <span className="text-slate-300 text-[10px]">-</span>}
                                    </TableCell>
                                    <TableCell className="p-4 text-right px-6">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* QUICK STATUS SELECT */}
                                            {(canEdit || canDelete) && (
                                                <Select
                                                    defaultValue={order.status}
                                                    disabled={!canEdit}
                                                    onValueChange={async (newStatus) => {
                                                        const res = await updateOrderAction(order.id || order._id, { ...order, status: newStatus }, slug);
                                                        if (res.success) {
                                                            toast.success("Estado actualizado");
                                                            router.refresh();
                                                        } else {
                                                            toast.error(res.error);
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 w-[110px] text-[9px] font-black uppercase rounded-lg border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(statusMap).map(([key, conf]) => (
                                                            <SelectItem key={key} value={key} className="uppercase text-[10px] font-bold">
                                                                {conf.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {canEdit && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setSelectedOrder(order); setIsFormOpen(true); }}
                                                        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                                    >
                                                        <Edit size={16} />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => { setOrderToDelete(order); setIsDeleteDialogOpen(true); }}
                                                        className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-red-50 transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {filteredOrders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                                    No se encontraron encargues.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* ADD/EDIT MODAL */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-xl bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden h-[85vh] flex flex-col">
                    <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">
                            {selectedOrder ? 'Editar Encargue' : 'Nuevo Encargue'}
                        </DialogTitle>
                        <DialogDescription className="hidden">
                            Formulario para gestionar encargues
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-0 overflow-hidden grow flex flex-col">
                        <OrderForm
                            orgId={orgId}
                            slug={slug}
                            initialData={selectedOrder}
                            customers={customers}
                            onSuccess={handleSuccess}
                            onCancel={() => setIsFormOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMATION */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Eliminar Encargue?</DialogTitle>
                        <DialogDescription className="text-center text-slate-500">
                            Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-destructive">
                            <AlertTriangle size={32} />
                        </div>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="rounded-xl h-12 font-bold uppercase text-[10px]">Cancelar</Button>
                            <Button onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive text-white rounded-xl h-12 font-black uppercase text-[10px]">
                                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
