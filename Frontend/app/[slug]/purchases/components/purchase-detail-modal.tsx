'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Package, Hash, Banknote } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface PurchaseItem {
    id: string;
    product_name: string;
    quantity: number;
    cost: number;
    product_sku?: string;
}

interface Purchase {
    id: string;
    created_at: string;
    total_amount: number;
    supplier_name?: string;
    items: PurchaseItem[];
}

interface Props {
    purchase: Purchase | null;
    isOpen: boolean;
    onClose: () => void;
}

export function PurchaseDetailModal({ purchase, isOpen, onClose }: Props) {
    if (!purchase) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-3xl bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
                <DialogHeader className="bg-slate-50 p-4 md:p-8 border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <DialogTitle className="text-xl md:text-2xl font-black uppercase tracking-tighter flex items-center gap-3 text-slate-900">
                            <ShoppingBag className="text-blue-600" size={28} /> Detalle de Compra
                        </DialogTitle>
                        <Badge className="bg-blue-100 text-blue-700 h-7 text-[10px] font-black uppercase tracking-widest px-3 border-none">
                            ID: {purchase?.id?.slice(-8).toUpperCase() || 'N/A'}
                        </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Fecha</p>
                            <p className="text-xs md:text-sm font-bold text-slate-700">{new Date(purchase.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Proveedor</p>
                            <p className="text-xs md:text-sm font-bold text-slate-700 truncate">{purchase.supplier_name || 'Compra Genérica'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Sucursal Destino</p>
                            <p className="font-bold text-slate-700 flex items-center gap-1.5 leading-tight">
                                <span className="text-xs md:text-sm truncate">{(purchase as any).branches?.name || 'Stock General'}</span>
                            </p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Inversión Total</p>
                            <p className="text-lg md:text-xl font-black text-emerald-600">${purchase.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>
                    <DialogDescription className="hidden">
                        Detalle de los productos incluidos en la compra.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col p-4 md:p-8 pt-4 md:pt-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                            <Hash size={16} />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Items Comprados</h4>
                    </div>

                    <div className="flex-1 rounded-2xl border border-slate-200 overflow-hidden flex flex-col bg-white shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50/50 h-10 border-b border-slate-100">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 pl-6">Producto</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Cantidad</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Costo Unit.</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right pr-6">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                        </Table>
                        <ScrollArea className="flex-1">
                            <Table>
                                <TableBody>
                                    {purchase.items?.map((item) => (
                                        <TableRow key={item.id} className="h-16 border-slate-100 hover:bg-slate-50 transition-colors">
                                            <TableCell className="pl-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700 text-sm">{item.product_name}</span>
                                                    {item.product_sku && <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 w-fit px-1.5 rounded mt-0.5">{item.product_sku}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-black text-slate-600">
                                                <Badge variant="outline" className="border-slate-200 text-slate-500 font-mono">x{item.quantity}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-slate-500 font-medium font-mono text-xs">
                                                ${item.cost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-black text-slate-900 font-mono">
                                                ${(item.quantity * item.cost).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
