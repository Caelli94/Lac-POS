'use client';

import React, { useState, useEffect } from 'react';
import { stockLotService } from '@/services/stockLotService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Loader2, Calendar, Package, Store, AlertTriangle, Trash2, Edit, Plus, Check, ChevronsUpDown, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { productService } from '@/services/productService';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function BatchManagement({ orgId, branches }: { orgId: string, branches: any[] }) {
    const [lots, setLots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [branchFilter, setBranchFilter] = useState('ALL');
    const [nearExpiration, setNearExpiration] = useState(false);

    // Create Lot State
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [searchProduct, setSearchProduct] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [openProductSelector, setOpenProductSelector] = useState(false);
    const [newLotData, setNewLotData] = useState({
        product_id: '',
        branch_id: branches[0]?.id || '',
        lot_number: '',
        expiration_date: '',
        stock: 0
    });

    // Adjust Lot State
    const [adjustingLot, setAdjustingLot] = useState<any>(null);
    const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
    const [newStock, setNewStock] = useState<number>(0);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchLots = async () => {
        setLoading(true);
        try {
            const res = await stockLotService.getAll(orgId, {
                branch_id: branchFilter,
                near_expiration: nearExpiration
            });
            setLots(res.data || []);
        } catch (error) {
            toast.error('Error al cargar lotes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLots();
    }, [branchFilter, nearExpiration]);

    const fetchProducts = async (search: string) => {
        try {
            const res = await productService.getAll(orgId, { search: search, limit: 10 });
            setProducts(res.data || []);
        } catch (error) {
            console.error('Error fetching products', error);
        }
    };

    useEffect(() => {
        if (isCreateDialogOpen) {
            fetchProducts('');
        }
    }, [isCreateDialogOpen]);

    const handleCreateLot = async () => {
        if (!newLotData.product_id || !newLotData.lot_number || !newLotData.expiration_date || newLotData.stock <= 0) {
            toast.error('Por favor completa todos los campos');
            return;
        }

        setCreating(true);
        try {
            await stockLotService.create(orgId, newLotData);
            toast.success('Lote creado correctamente');
            setIsCreateDialogOpen(false);
            setNewLotData({
                product_id: '',
                branch_id: branches[0]?.id || '',
                lot_number: '',
                expiration_date: '',
                stock: 0
            });
            setSelectedProduct(null);
            fetchLots();
        } catch (error) {
            toast.error('Error al crear lote');
        } finally {
            setCreating(false);
        }
    };

    const handleAdjust = (lot: any) => {
        setAdjustingLot(lot);
        setNewStock(lot.stock);
        setIsAdjustDialogOpen(true);
    };

    const saveAdjustment = async () => {
        if (!adjustingLot) return;
        setIsUpdating(true);
        try {
            await stockLotService.adjustStock(orgId, adjustingLot._id, newStock);
            toast.success('Stock actualizado correctamente');
            setIsAdjustDialogOpen(false);
            fetchLots();
        } catch (error) {
            toast.error('Error al actualizar stock');
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredLots = lots.filter(lot =>
        lot.product_id?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.lot_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.product_id?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
    };

    const getRemainingDays = (date: string) => {
        const diff = new Date(date).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este lote?')) return;
        try {
            await stockLotService.delete(orgId, id);
            toast.success('Lote eliminado');
            fetchLots();
        } catch (error) {
            toast.error('Error al eliminar lote');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                        placeholder="Buscar por producto, lote o SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-medium"
                    />
                </div>

                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-black uppercase text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="ALL">Todas las Sucursales</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    <Button
                        variant={nearExpiration ? "default" : "outline"}
                        onClick={() => setNearExpiration(!nearExpiration)}
                        className={cn(
                            "h-11 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2",
                            nearExpiration ? "bg-amber-600 hover:bg-amber-700" : "text-slate-500"
                        )}
                    >
                        <Calendar size={16} />
                        Vencimientos Próximos
                    </Button>

                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-11 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest gap-2 px-6">
                                <Plus size={16} />
                                Nuevo Lote
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md bg-white rounded-[2rem] p-0 border-none shadow-2xl">
                            <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
                                <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Crear Nuevo Lote</DialogTitle>
                            </DialogHeader>
                            <div className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-slate-500">Producto</Label>
                                    <Popover open={openProductSelector} onOpenChange={setOpenProductSelector}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" role="combobox" className="w-full justify-between h-11 rounded-xl border-slate-200">
                                                <span className="truncate">{selectedProduct ? selectedProduct.name : 'Buscar producto...'}</span>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0 rounded-xl" align="start">
                                            <Command>
                                                <CommandInput placeholder="Buscar por nombre o SKU..." onValueChange={(v) => fetchProducts(v)} />
                                                <CommandList>
                                                    <CommandEmpty>No se encontraron productos.</CommandEmpty>
                                                    <CommandGroup>
                                                        {products.map((p) => (
                                                            <CommandItem
                                                                key={p.id}
                                                                onSelect={() => {
                                                                    setSelectedProduct(p);
                                                                    setNewLotData({ ...newLotData, product_id: p.id });
                                                                    setOpenProductSelector(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", selectedProduct?.id === p.id ? "opacity-100" : "opacity-0")} />
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold uppercase text-xs">{p.name}</span>
                                                                    <span className="text-[10px] text-slate-400 font-mono">{p.sku}</span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">N° de Lote</Label>
                                        <Input
                                            value={newLotData.lot_number}
                                            onChange={(e) => setNewLotData({ ...newLotData, lot_number: e.target.value.toUpperCase() })}
                                            placeholder="EJ: L-1001"
                                            className="h-11 rounded-xl border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Sucursal</Label>
                                        <select
                                            value={newLotData.branch_id}
                                            onChange={(e) => setNewLotData({ ...newLotData, branch_id: e.target.value })}
                                            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold uppercase"
                                        >
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Vencimiento</Label>
                                        <Input
                                            type="date"
                                            value={newLotData.expiration_date}
                                            onChange={(e) => setNewLotData({ ...newLotData, expiration_date: e.target.value })}
                                            className="h-11 rounded-xl border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold uppercase text-slate-500">Stock Inicial</Label>
                                        <Input
                                            type="number"
                                            value={newLotData.stock}
                                            onChange={(e) => setNewLotData({ ...newLotData, stock: parseInt(e.target.value) || 0 })}
                                            className="h-11 rounded-xl border-slate-200 text-center font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
                                <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="rounded-xl font-bold uppercase text-[10px]">Cancelar</Button>
                                <Button
                                    onClick={handleCreateLot}
                                    disabled={creating}
                                    className="bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase text-[10px] transition-all px-8 h-11"
                                >
                                    {creating ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
                                    Crear Lote
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50 h-14">
                        <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="w-16"></TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500">Producto / Lote</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500">Sucursal</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500">Vencimiento</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-500">Estado</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase text-slate-500">Stock</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 pr-8">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="animate-spin text-blue-500" size={32} />
                                        <p className="text-xs font-black uppercase text-slate-400">Consultando lotes...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredLots.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-2 opacity-30">
                                        <Package size={48} className="text-slate-400" />
                                        <p className="text-xs font-black uppercase text-slate-400">No se encontraron lotes</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLots.map((lot) => {
                                const days = getRemainingDays(lot.expiration_date);
                                const isExpired = days <= 0;
                                const isWarning = days > 0 && days <= 30;

                                return (
                                    <TableRow key={lot._id} className="h-20 border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="pl-6">
                                            <div className="w-12 h-12 relative rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                                {lot.product_id?.image_url ? (
                                                    <Image src={lot.product_id.image_url} alt="" fill className="object-cover" />
                                                ) : (
                                                    <Package size={20} className="text-slate-300" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black uppercase text-slate-800 tracking-tight">{lot.product_id?.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[9px] font-black uppercase border-none py-0 h-4">
                                                        LOTE: {lot.lot_number}
                                                    </Badge>
                                                    {lot.product_id?.sku && (
                                                        <span className="text-[9px] font-mono font-bold text-slate-400">{lot.product_id?.sku}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Store size={14} className="text-slate-300" />
                                                <span className="text-xs font-bold text-slate-600 uppercase">{lot.branch_id?.name || 'Central'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700">{formatDate(lot.expiration_date)}</span>
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase",
                                                    isExpired ? "text-red-500" : isWarning ? "text-amber-500" : "text-green-500"
                                                )}>
                                                    {isExpired ? "Vencido" : `Vence en ${days} días`}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {isExpired ? (
                                                <Badge className="bg-red-500 text-white border-none text-[8px] font-black uppercase py-1">Expirado</Badge>
                                            ) : isWarning ? (
                                                <Badge className="bg-amber-500 text-white border-none text-[8px] font-black uppercase py-1">Crítico</Badge>
                                            ) : (
                                                <Badge className="bg-green-500 text-white border-none text-[8px] font-black uppercase py-1">Óptimo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-black text-slate-900">{lot.stock} U.</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Inicial: {lot.initial_stock}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleAdjust(lot)}
                                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(lot._id)}
                                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* DIÁLOGO DE AJUSTE DE STOCK */}
            <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
                <DialogContent className="max-w-xs bg-white rounded-[2rem] p-0 border-none shadow-2xl">
                    <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
                        <DialogTitle className="text-sm font-black uppercase text-slate-900">Ajustar Stock de Lote</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Stock Actual</span>
                            <span className="text-2xl font-black text-slate-900">{adjustingLot?.stock} U.</span>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-500">Nuevo Stock Disponible</Label>
                            <Input
                                type="number"
                                value={newStock}
                                onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                                className="h-12 rounded-xl border-slate-200 text-center text-lg font-black"
                            />
                        </div>
                    </div>
                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
                        <Button
                            onClick={saveAdjustment}
                            disabled={isUpdating}
                            className="w-full bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase text-[10px] h-12 shadow-lg"
                        >
                            {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} className="mr-2" />}
                            Confirmar Ajuste
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
