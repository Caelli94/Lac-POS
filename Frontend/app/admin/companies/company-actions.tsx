'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ShieldAlert, Trash2, Eye, ShieldCheck, Loader2 } from "lucide-react"
import { DeleteCompanyDialog } from './delete-company-dialog'
import { toggleStatusAction } from './[id]/actions'
import { toast } from 'sonner'

interface CompanyActionsProps {
    organization: {
        _id: string;
        name: string;
        slug: string;
        subscription_status?: string;
    }
}

export function CompanyActions({ organization }: CompanyActionsProps) {
    const [isPending, startTransition] = useTransition()
    const isSuspended = organization.subscription_status === 'suspended'

    const handleToggleStatus = async () => {
        startTransition(async () => {
            try {
                await toggleStatusAction(organization._id, organization.subscription_status || 'active')
                toast.success(isSuspended ? 'Empresa reactivada' : 'Empresa suspendida correctamente')
            } catch (error) {
                toast.error('Error al cambiar el estado')
            }
        })
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <Link href={`/admin/companies/${organization._id}`}>
                    <DropdownMenuItem className="cursor-pointer font-bold text-xs py-2.5">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalles
                    </DropdownMenuItem>
                </Link>

                <DropdownMenuItem
                    className={`cursor-pointer font-bold text-xs py-2.5 ${isSuspended ? 'text-green-600 focus:text-green-700' : 'text-orange-600 focus:text-orange-700'}`}
                    onClick={handleToggleStatus}
                    disabled={isPending}
                >
                    {isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        isSuspended ? <ShieldCheck className="mr-2 h-4 w-4" /> : <ShieldAlert className="mr-2 h-4 w-4" />
                    )}
                    {isSuspended ? 'Reactivar Empresa' : 'Suspender Empresa'}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DeleteCompanyDialog
                    organization={organization}
                    trigger={
                        <DropdownMenuItem
                            className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer font-bold text-xs py-2.5"
                            onSelect={(e) => e.preventDefault()}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                        </DropdownMenuItem>
                    }
                />
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
