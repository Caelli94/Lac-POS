'use client';

import React, { useState, useEffect } from 'react';
import {
    Edit, ImageOff, Loader2, Store,
    Trash2, AlertTriangle, Plus, Tag
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import Image from 'next/image';
import { ProductForm } from '../inventory/new/product-form';
import { deleteProductAction, updateProductVisibilityAction } from '../inventory/new/actions';
import { productService } from '@/services/productService';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface SupplierProductListProps {
    orgId: string;
    slug: string;
    supplierId: string;
    categories: any[];
    branches: any[];
    priceLists: any[];
    suppliers: any[]; // Needed for ProductForm
}

export function SupplierProductList({
    orgId, slug, supplierId, categories, branches, priceLists, suppliers
}: SupplierProductListProps) {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedListId, setSelectedListId] = useState<string>('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    // Edit/Delete States
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [isDeleteProductOpen, setIsDeleteProductOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        // Initialize Default Price List
        const activeOnes = (priceLists || []).filter((l: any) => l.is_active);
        const main = activeOnes.find((l: any) => l.name === 'PRINCIPAL');
        if (main) setSelectedListId(main.id);
        else if (activeOnes.length > 0) setSelectedListId(activeOnes[0].id);

        // Fetch Products filtered by Supplier
        setLoading(true);
        productService.getAll(orgId, { supplierId }).then(res => {
            setProducts(res?.data || []);
            setLoading(false);
        });
    }, [orgId, supplierId, priceLists]);

    // Helpers
    const getRubroNames = (ids: any[]) => {
        if (!ids || ids.length === 0) return '-';
        return ids.map((item: any) => {
            if (typeof item === 'object' && item.name) return item.name;
            return categories.find((c: any) => c.id === item)?.name;
        }).filter(Boolean).join(', ');
    };

    const formatFecha = (iso: string) => {
        if (!iso) return '-';
        try { return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(iso)); }
        catch (e) { return '-'; }
    };

    const toggleRowExpansion = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedRows(newExpanded);
    };

    // Actions
    const handleProductSaved = (saved: any) => {
        if (selectedProduct) setProducts(products.map((p: any) => p.id === saved.id ? saved : p));
        else setProducts([saved, ...products]);
        setIsDialogOpen(false);
    };

    const handleConfirmDeleteProduct = async () => {
        if (!productToDelete) return;
        setIsDeleting(true);
        const res = await deleteProductAction(orgId, slug, productToDelete.id);
        if (res.success) {
            setProducts(products.filter((p: any) => p.id !== productToDelete.id));
            setIsDeleteProductOpen(false);
            toast.success("Eliminado");
        } else {
            toast.error(res.error);
        }
        setIsDeleting(false);
    };

    const handleToggleVisibility = async (productId: string, currentVal: boolean) => {
        const newVal = !currentVal;
        setProducts(products.map((p: any) => p.id === productId ? { ...p, is_visible: newVal } : p));
        const res = await updateProductVisibilityAction(orgId, slug, productId, newVal);
        if (!res.success) {
            toast.error("Error al actualizar");
            setProducts(products.map((p: any) => p.id === productId ? { ...p, is_visible: currentVal } : p));
        }
    };

    if (loading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>;

    if (products.length === 0) return <div className="text-center py-8 text-slate-400 italic font-medium text-sm border border-dashed rounded-xl border-slate-200 bg-white">No hay productos asociados a este proveedor.</div>;

    return (
        <div className="space-y-4">
            {/* Minimal Toolbar for Price List Selection */}
            <div className="flex justify-end mb-2">
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Tag size={10} /> Lista:</div>
                    <select value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)} className="bg-transparent border-none rounded-lg h-7 text-[10px] font-black uppercase px-2 cursor-pointer outline-none shadow-none focus:ring-0">
                        {(priceLists || []).filter((l: any) => l.is_active).map((list: any) => (<option key={list.id} value={list.id}>{list.name}</option>))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/80 h-10">
                        <TableRow className="text-[9px] uppercase font-black border-slate-200 hover:bg-transparent">
                            <TableHead className="w-12 text-center">Img</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>C. Prov. Interno</TableHead>
                            <TableHead>Rubro</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Precio</TableHead>
                            <TableHead className="text-center w-14">Web</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right px-6">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((p: any) => {
                            const priceData = Array.isArray(p.pricing)
                                ? p.pricing.find((item: any) => item.list_id === selectedListId || item.list_id?._id === selectedListId)
                                : p.pricing?.[selectedListId];

                            let val = priceData ? (priceData.price !== undefined ? priceData.price : priceData.finalPrice) : null;
                            const currentList = priceLists.find((l: any) => l.id === selectedListId);
                            if ((val === null || val === undefined) && currentList?.name === 'PRINCIPAL') {
                                val = p.price;
                            }

                            const priceToShow = val !== null && val !== undefined ? `$ ${val}` : '-';
                            const totalStock = p.variants?.reduce((acc: number, v: any) => acc + (parseInt(v.stock) || 0), 0) || 0;

                            return (
                                <React.Fragment key={p.id}>
                                    <TableRow className={cn("border-slate-100 h-14 hover:bg-slate-50 transition-colors cursor-pointer", expandedRows.has(p.id) && "bg-slate-50/80")} onClick={() => toggleRowExpansion(p.id)}>
                                        <TableCell className="p-3 text-center"><div className="w-8 h-8 relative rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden mx-auto">{p.image_url ? <Image src={p.image_url} alt="" fill className="object-cover" /> : <ImageOff size={14} className="text-slate-300" />}</div></TableCell>
                                        <TableCell className="p-3 font-black text-slate-800 text-[11px] uppercase">{p.name}</TableCell>
                                        <TableCell className="p-3 text-[10px] font-mono text-slate-500">{p.supplier_product_code || '-'}</TableCell>
                                        <TableCell className="p-3"><Badge variant="secondary" className="text-[8px] uppercase font-black bg-slate-100 text-slate-500 border-none">{getRubroNames(p.category_ids)}</Badge></TableCell>
                                        <TableCell className="p-3 text-[10px] font-mono">{p.sku || '-'}</TableCell>
                                        <TableCell className="p-3 text-right font-black text-[11px] text-blue-600">{priceToShow}</TableCell>
                                        <TableCell className="p-3 text-center"><Switch checked={p.is_visible} onCheckedChange={() => handleToggleVisibility(p.id, p.is_visible)} onClick={(e) => e.stopPropagation()} className="scale-75" /></TableCell>
                                        <TableCell className="p-3 text-right"><Badge className="bg-slate-900 text-white font-black text-[9px]">{totalStock}</Badge></TableCell>
                                        <TableCell className="p-3 text-right space-x-1 px-4">
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedProduct(p); setIsDialogOpen(true); }} className="h-7 w-7 hover:bg-white hover:text-primary transition-all shadow-none"><Edit size={14} /></Button>
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setProductToDelete(p); setIsDeleteProductOpen(true); }} className="h-7 w-7 text-slate-300 hover:text-destructive shadow-none transition-all"><Trash2 size={14} /></Button>
                                        </TableCell>
                                    </TableRow>

                                    {/* EXPANDIDO: Variantes */}
                                    {expandedRows.has(p.id) && (
                                        <TableRow className="bg-slate-50/50 border-none hover:bg-slate-50/50">
                                            <TableCell colSpan={8} className="p-0 border-t-0">
                                                <div className="px-8 py-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-sm">
                                                        <Table>
                                                            <TableHeader className="bg-slate-50/60 h-8">
                                                                <TableRow className="hover:bg-transparent border-slate-100 text-[8px] font-black uppercase text-slate-500">
                                                                    <TableHead className="py-2 px-4">Variante</TableHead>
                                                                    {branches.map((br: any) => <TableHead key={br.id} className="py-2 px-4 text-center">{br.name}</TableHead>)}
                                                                    <TableHead className="py-2 px-4 text-right">Subtotal</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {p.variants?.map((v: any, i: number) => (
                                                                    <TableRow key={i} className="border-slate-50 hover:bg-slate-50/30 h-10">
                                                                        <TableCell className="py-2 px-4 flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: v.color_hex }} />
                                                                            <span className="text-[10px] font-black uppercase text-slate-700">{v.color || 'Único'} - {v.size || 'S/T'}</span>
                                                                        </TableCell>
                                                                        {branches.map((br: any) => <TableCell key={br.id} className="py-2 px-4 text-center text-[10px] font-black text-slate-700">{v.branch_stocks?.[br.id] || 0}</TableCell>)}
                                                                        <TableCell className="py-2 px-4 text-right"><Badge className="bg-slate-900 text-white font-black text-[9px] px-3 py-1 rounded-lg">{v.stock || 0}</Badge></TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Configured ProductForm Dialog */}
            {/* Configured ProductForm Dialog - UNIFIED STYLE */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-5xl bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden h-[90vh] flex flex-col">
                    <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">
                            {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        <ProductForm
                            key={selectedProduct?.id}
                            initialData={selectedProduct}
                            isEditMode={true}
                            orgId={orgId}
                            slug={slug}
                            categories={categories}
                            suppliers={suppliers}
                            // Using defaults for custom attributes/labels as they aren't drilled down here yet
                            onSuccess={handleProductSaved}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteProductOpen} onOpenChange={setIsDeleteProductOpen}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Eliminar Producto?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-destructive"><AlertTriangle size={32} /></div>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button variant="outline" onClick={() => setIsDeleteProductOpen(false)} className="rounded-xl h-12 font-bold uppercase text-[10px]">Cancelar</Button>
                            <Button onClick={() => handleConfirmDeleteProduct()} disabled={isDeleting} className="bg-destructive text-white rounded-xl h-12 font-black uppercase text-[10px]">Sí, Eliminar</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
