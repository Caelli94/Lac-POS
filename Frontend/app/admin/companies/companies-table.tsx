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
import { Search, Building } from "lucide-react"
import Link from 'next/link'
import { CompanyActions } from './company-actions'

interface Organization {
    id: string;
    name: string;
    slug: string;
    subscription_status: string;
    created_at: string;
    audit_roles: string[];
    storage_usage: number;
}

interface Props {
    initialOrganizations: Organization[];
}

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function CompaniesTable({ initialOrganizations }: Props) {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredOrgs = initialOrganizations.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-4">
            {/* Buscador */}
            <div className="relative group max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
                <Input
                    placeholder="Buscar por nombre o slug..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 bg-white border-slate-200 rounded-xl font-medium shadow-sm focus-visible:ring-slate-900 text-sm"
                />
            </div>

            {/* TABLA DE EMPRESAS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-200 uppercase text-[10px] font-black tracking-widest text-slate-500 h-12">
                            <TableHead className="pl-6">Empresa</TableHead>
                            <TableHead>Identificador (Slug)</TableHead>
                            <TableHead>Auditoría</TableHead>
                            <TableHead>Almacenamiento</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Creada</TableHead>
                            <TableHead className="text-right pr-6">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrgs.map((org) => (
                            <TableRow key={org.id} className="group hover:bg-slate-50/80 transition-colors border-slate-100 h-16">
                                <TableCell className="pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center text-xs font-black shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                                            {org.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <Link
                                                href={`/admin/companies/${org.id}`}
                                                className="text-slate-900 hover:text-blue-600 font-bold text-sm transition-colors"
                                            >
                                                {org.name}
                                            </Link>
                                            <span className="text-[10px] text-slate-400 font-medium">ORG-ID: {org.id.substring(org.id.length - 8)}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-mono text-[10px] bg-slate-50/50 text-slate-500 border-slate-200 px-2">
                                        /{org.slug}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {org.audit_roles.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {org.audit_roles.map(role => (
                                                <span key={role} className="text-[9px] text-orange-600 font-black bg-orange-50 border border-orange-100 px-1.5 rounded-md uppercase tracking-tight">
                                                    {role}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-slate-200 text-xs">-</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className="text-slate-600 font-mono text-[10px] font-medium">
                                        {formatBytes(org.storage_usage)}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {org.subscription_status === 'active' ? (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px] font-bold">Activa</Badge>
                                    ) : (
                                        <Badge variant="destructive" className="text-[10px] font-bold">Suspendida</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs text-slate-500 font-medium">{new Date(org.created_at).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right pr-6">
                                    <CompanyActions
                                        organization={{
                                            _id: org.id,
                                            name: org.name,
                                            slug: org.slug,
                                            subscription_status: org.subscription_status
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}

                        {filteredOrgs.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-2">
                                        <Building size={40} className="text-slate-200" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No se encontraron empresas</p>
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
