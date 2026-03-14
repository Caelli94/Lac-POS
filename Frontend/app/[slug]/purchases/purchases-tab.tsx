'use client';

import Link from 'next/link'
import { Plus, Truck, Eye, Search, Calendar, User } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PurchaseDetailModal } from './components/purchase-detail-modal'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'


interface Props {
    purchases: any[];
    slug: string;
    canEdit?: boolean;
}

export function PurchasesTab({ purchases, slug, canEdit }: Props) {
    const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleViewDetail = (purchase: any) => {
        setSelectedPurchase(purchase);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    {/* Title is handled by Layout/Tabs usually, but if inside tab, maybe just actions? */}
                    {/* If we want to keep the header, we can. */}
                </div>
                <div className="flex gap-2 ml-auto">
                    {canEdit && (
                        <>
                            <Link href={`/${slug}/suppliers`}>
                                <Button variant="outline" className="border-slate-300 text-slate-600 font-bold uppercase text-[10px] h-10 px-4 rounded-xl shadow-none">
                                    Gestionar Proveedores
                                </Button>
                            </Link>
                            <Link href={`/${slug}/purchases/new`}>
                                <Button className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl gap-2 shadow-none">
                                    <Plus size={16} /> Nueva Compra
                                </Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/80 h-12 text-[10px] uppercase font-black border-slate-200 text-slate-500">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="pl-6 w-32">Fecha</TableHead>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Sucursal Destino</TableHead>
                            <TableHead className="text-center">Operador</TableHead>
                            <TableHead className="text-right">Total Inversión</TableHead>
                            <TableHead className="text-right pr-6 w-32">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {purchases?.map((p: any) => (
                            <TableRow key={p.id || p._id} className="h-16 hover:bg-slate-50 transition-colors group">
                                <TableCell className="pl-6">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 w-fit px-2 py-1 rounded-lg">
                                        <Calendar size={12} className="text-slate-400" />
                                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <User size={14} />
                                        </div>
                                        <span className="font-bold text-slate-700 text-sm">
                                            {p.suppliers?.name || 'Compra Genérica'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold uppercase text-[9px] px-2 py-0.5 rounded-lg bg-slate-50/50">
                                        {p.branches?.name || 'Stock General'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold text-slate-700 uppercase px-2 py-1 bg-slate-100 rounded-md border border-slate-200">
                                            {p.performer?.name || 'Sistema'}
                                        </span>
                                        {p.performer?.role && (
                                            <span className="text-[9px] font-black text-slate-400 uppercase mt-0.5 italic tracking-widest">
                                                {p.performer.role === 'admin' ? 'Administrador' : p.performer.role}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-black text-slate-900 text-sm">
                                    ${p.total_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleViewDetail(p)}
                                        className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                    >
                                        <Eye size={18} />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}


                        {purchases?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-10 text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <Truck size={32} className="opacity-20" />
                                        <p>No has registrado compras aún.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <PurchaseDetailModal
                purchase={selectedPurchase}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>

    )
}
