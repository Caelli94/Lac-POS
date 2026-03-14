'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Wallet, AlertTriangle, CheckCircle2, Clock, ArrowRight } from "lucide-react"
import Link from 'next/link'
import { Button } from "@/components/ui/button"

interface Props {
    organizations: any[];
}

export function AccountingTable({ organizations }: Props) {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusBadge = (org: any) => {
        const nextDue = org.subscription_details?.next_due_date ? new Date(org.subscription_details.next_due_date) : null
        const today = new Date()

        if (!nextDue) return <Badge variant="outline" className="text-slate-400 text-[10px] font-bold">Sin Datos</Badge>

        if (nextDue < today) {
            return <Badge variant="destructive" className="gap-1 text-[10px] font-bold"><AlertTriangle size={12} /> Vencido</Badge>
        }

        const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays <= 7) {
            return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 gap-1 text-[10px] font-bold"><Clock size={12} /> Próximo</Badge>
        }

        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1 text-[10px] font-bold"><CheckCircle2 size={12} /> Al día</Badge>
    }

    const getPeriodLabel = (period: string) => {
        const labels: Record<string, string> = {
            'monthly': 'Mensual',
            'quarterly': 'Trimestral',
            'semiannual': 'Semestral',
            'yearly': 'Anual',
            'lifetime': 'Único'
        }
        return labels[period] || period
    }

    return (
        <div className="space-y-4">
            {/* Buscador */}
            <div className="relative group max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                <Input
                    placeholder="Buscar empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 bg-white border-slate-200 rounded-xl font-medium shadow-sm focus-visible:ring-slate-900 text-sm"
                />
            </div>

            {/* TABLA DE CONTABILIDAD */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-200 uppercase text-[10px] font-black tracking-widest text-slate-500 h-12">
                            <TableHead className="pl-6">Empresa</TableHead>
                            <TableHead className="text-center">Plan / Ciclo</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="text-center">Vencimiento</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead className="text-right pr-6">Acción</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrgs.map((org) => (
                            <TableRow key={org._id || org.id} className="group hover:bg-slate-50/80 transition-colors border-slate-100 h-16">
                                <TableCell className="pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center text-xs font-black shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                                            {org.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 font-bold text-sm tracking-tight">{org.name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">/{org.slug}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="uppercase text-[9px] font-black bg-slate-50 text-slate-500 border-slate-200 px-2 py-0.5">
                                        {org.subscription_details?.period ? getPeriodLabel(org.subscription_details.period) : 'N/A'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className="font-black font-mono text-sm text-slate-900">
                                        {org.subscription_details?.currency || '$'} {org.subscription_details?.amount?.toLocaleString() || '0'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="text-xs font-bold text-slate-600">
                                        {org.subscription_details?.next_due_date ?
                                            new Date(org.subscription_details.next_due_date).toLocaleDateString() :
                                            '-'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    {getStatusBadge(org)}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <Link href={`/admin/companies/${org._id || org.id}?tab=finance`}>
                                        <Button variant="ghost" size="sm" className="h-8 group/btn hover:bg-slate-900 hover:text-white transition-all rounded-lg font-black text-[10px] uppercase tracking-widest gap-2 pl-3">
                                            Gestionar
                                            <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}

                        {filteredOrgs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-2">
                                        <Wallet size={40} className="text-slate-200" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron registros</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
