"use client";

import React, { useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Package, X, Check, Box, Tag } from "lucide-react";

interface VariantSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: any | null;
    onSelectVariant: (variant: any, priceListId?: string) => void;
    branchId?: string | null;
    priceLists?: any[];
    defaultPriceListId?: string;
}

export function VariantSelector({
    open,
    onOpenChange,
    product,
    onSelectVariant,
    branchId,
    priceLists = [],
    defaultPriceListId = ''
}: VariantSelectorProps) {
    const [selectedListId, setSelectedListId] = useState(defaultPriceListId);

    // Reset when dialog opens with new product
    React.useEffect(() => {
        if (open) setSelectedListId(defaultPriceListId);
    }, [open, defaultPriceListId]);

    // 1. Analyze available attributes dynamically
    const columns = useMemo(() => {
        const cols = new Set<string>();
        let hasColor = false;
        let hasSize = false;

        const variantsList = product?.variants || [];
        variantsList.forEach((v: any) => {
            if (v.color) hasColor = true;
            if (v.size) hasSize = true;
            if (v.custom_attributes) {
                Object.keys(v.custom_attributes).forEach(k => cols.add(k));
            }
        });

        return {
            hasColor,
            hasSize,
            custom: Array.from(cols)
        };
    }, [product]);

    if (!product) return null;

    const variants = product.variants || [];

    // Get price for the selected list
    const getPriceForList = (pricing: any[], listId: string) => {
        if (!pricing || !listId) return null;
        const entry = pricing.find((e: any) => e.list_id === listId || e.list_id?._id === listId);
        return entry?.price ?? null;
    };

    const productPrice = getPriceForList(product.pricing || [], selectedListId) ?? product.price;

    const handleSelect = (variant: any) => {
        onSelectVariant(variant, selectedListId);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-[800px] p-0 overflow-hidden rounded-[1.5rem] border-none shadow-2xl font-sans bg-white ring-0 outline-none max-h-[95vh] flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center bg-slate-50 p-6 border-b border-slate-100">
                    <div>
                        <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Box className="text-slate-500" size={24} />
                            {product.name}
                            {product.sku && <Badge variant="outline" className="ml-2 font-mono text-[10px] text-slate-500 border-slate-300">{product.sku}</Badge>}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 mt-1">
                            Selecciona una variante para agregar al ticket.
                        </DialogDescription>
                    </div>
                </div>

                {/* Price List Selector */}
                {priceLists.length > 0 && (
                    <div className="px-6 pt-4 pb-2">
                        <div className="flex items-center gap-3 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                            <Tag size={14} className="text-indigo-500 shrink-0" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase shrink-0">Lista de Precio:</span>
                            <Select value={selectedListId} onValueChange={setSelectedListId}>
                                <SelectTrigger className="bg-white border-indigo-200 rounded-lg h-9 text-[11px] font-black uppercase px-4 min-w-[140px] shadow-sm focus:ring-2 focus:ring-indigo-300">
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {priceLists.map(list => (
                                        <SelectItem key={list.id || list._id} value={list.id || list._id} className="text-[10px] uppercase font-bold text-slate-700">
                                            {list.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="ml-auto text-right">
                                <span className="text-[9px] font-black text-indigo-400 uppercase block">Precio Base</span>
                                <span className="text-sm font-black text-indigo-600">${productPrice?.toLocaleString('es-AR') || '0'}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="p-6 pt-2">
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                        <ScrollArea className="max-h-[400px]">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow className="border-slate-100">
                                        {/* Dynamic Headers */}
                                        {columns.hasColor && <TableHead className="w-[20%] text-xs font-bold uppercase text-slate-500">Color</TableHead>}
                                        {columns.hasSize && <TableHead className="w-[15%] text-xs font-bold uppercase text-slate-500 text-center">Talle</TableHead>}

                                        {columns.custom.map(col => (
                                            <TableHead key={col} className="text-xs font-bold uppercase text-slate-500">{col}</TableHead>
                                        ))}

                                        <TableHead className="text-center w-[15%] text-xs font-bold uppercase text-slate-500">Stock</TableHead>
                                        <TableHead className="text-right w-[150px] text-xs font-bold uppercase text-slate-500">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {variants.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center py-12 text-slate-400">
                                                <Package size={32} className="mx-auto mb-2 opacity-20" />
                                                <p className="font-medium text-sm">No hay variantes configuradas</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        variants.map((variant: any, index: number) => {
                                            // Stock Logic
                                            let currentStock = variant.stock || 0;
                                            if (branchId && variant.branch_stocks) {
                                                if (variant.branch_stocks instanceof Map) {
                                                    currentStock = variant.branch_stocks.get(branchId) || 0;
                                                } else {
                                                    currentStock = variant.branch_stocks[branchId] || 0;
                                                }
                                            }
                                            const hasStock = currentStock > 0;
                                            const totalGlobalStock = variant.stock || 0;
                                            const otherStock = Math.max(0, totalGlobalStock - currentStock);
                                            const colorHex = variant.color_hex || '#000000';

                                            return (
                                                <TableRow
                                                    key={index}
                                                    className={cn(
                                                        "transition-all cursor-pointer border-slate-50",
                                                        hasStock ? "hover:bg-slate-50" : "opacity-60 bg-slate-50/50"
                                                    )}
                                                    onClick={() => handleSelect(variant)}
                                                >
                                                    {/* COLOR */}
                                                    {columns.hasColor && (
                                                        <TableCell className="py-4">
                                                            {variant.color ? (
                                                                <div className="flex items-center gap-3">
                                                                    <div
                                                                        className="h-6 w-6 rounded-full shadow-sm border border-slate-200 shrink-0"
                                                                        style={{ backgroundColor: colorHex }}
                                                                    />
                                                                    <span className="font-bold text-slate-700 text-xs">{variant.color}</span>
                                                                </div>
                                                            ) : <span className="text-slate-300">-</span>}
                                                        </TableCell>
                                                    )}

                                                    {/* SIZE */}
                                                    {columns.hasSize && (
                                                        <TableCell className="text-center py-4">
                                                            {variant.size ? (
                                                                <Badge variant="outline" className="min-w-[2rem] justify-center bg-white text-slate-600 border-slate-200 font-bold text-[10px]">
                                                                    {variant.size}
                                                                </Badge>
                                                            ) : <span className="text-slate-300">-</span>}
                                                        </TableCell>
                                                    )}

                                                    {/* DYNAMIC COLUMNS */}
                                                    {columns.custom.map(col => (
                                                        <TableCell key={col} className="py-4">
                                                            {variant.custom_attributes?.[col] ? (
                                                                <span className="text-xs font-medium text-slate-600">
                                                                    {variant.custom_attributes[col]}
                                                                </span>
                                                            ) : <span className="text-slate-300">-</span>}
                                                        </TableCell>
                                                    ))}

                                                    {/* STOCK */}
                                                    <TableCell className="text-center py-4">
                                                        <div className="flex flex-col items-center">
                                                            <Badge
                                                                variant={hasStock ? "secondary" : "destructive"}
                                                                className={cn(
                                                                    "min-w-[3rem] justify-center text-[10px] font-bold",
                                                                    hasStock ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-100"
                                                                )}
                                                            >
                                                                {currentStock} Un
                                                            </Badge>
                                                            {otherStock > 0 && (
                                                                <span className="text-[9px] text-indigo-400 font-bold mt-1">
                                                                    +{otherStock} en otras
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    {/* ACTION */}
                                                    <TableCell className="text-right py-4">
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => { e.stopPropagation(); handleSelect(variant); }}
                                                            className={cn(
                                                                "h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all",
                                                                hasStock ? "bg-slate-900 hover:bg-slate-800 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200 hover:border-slate-800 hover:text-slate-900"
                                                            )}
                                                        >
                                                            {hasStock ? 'Seleccionar' : 'Liberar'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl font-bold text-xs h-10 px-6 border-slate-200 hover:bg-white">
                        Cancelar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

