'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import SupplierCheckingAccountManager from '@/components/SupplierCheckingAccountManager'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
    isOpen: boolean
    onClose: (finalBalance?: number) => void
    supplier: any
    orgId: string
    account: any
    slug: string // Added slug
}

const CensoredLimit = ({ limit }: { limit: number }) => {
    const [isVisible, setIsVisible] = React.useState(false);
    return (
        <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase mt-2">
            <span>Límite de Saldo:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                {isVisible ?
                    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(limit) :
                    "••••••"
                }
            </span>
            <button
                onClick={() => setIsVisible(!isVisible)}
                className="hover:text-slate-900 transition-colors p-1"
                title={isVisible ? "Ocultar Límite" : "Ver Límite"}
            >
                {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
        </div>
    );
};

export function CheckingAccountModal({ isOpen, onClose, supplier, orgId, account, slug }: Props) {
    if (!supplier) return null;

    // supplier.credit_balance comes from the table projection, but we want real-time updates from the manager
    const [currentBalance, setCurrentBalance] = React.useState(supplier.credit_balance || 0);

    return (
        <Dialog open={isOpen} onOpenChange={() => onClose(currentBalance)}>
            <DialogContent className="!max-w-[1200px] w-[95vw] h-[90vh] bg-white border-none p-0 shadow-2xl overflow-hidden flex flex-col rounded-[2rem]">
                <DialogHeader className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between space-y-0 shrink-0">
                    <div className="flex flex-col gap-1">
                        <DialogTitle className="text-4xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-4">
                            {supplier.name}
                        </DialogTitle>
                        <p className="text-slate-500 text-base font-medium flex items-center gap-3">
                            <span className="bg-slate-200/50 px-2 py-0.5 rounded-md font-mono text-slate-600 border border-slate-200/60 text-sm">
                                {supplier.tax_id || 'S/CUIT'}
                            </span>
                            {supplier.email && (
                                <span className="text-slate-400 text-sm">{supplier.email}</span>
                            )}
                        </p>
                        <CensoredLimit limit={supplier.credit_limit || 0} />
                    </div>

                    <div className="text-right">
                        <div className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-1">Saldo</div>
                        <div className={`text-4xl font-black tracking-tighter ${currentBalance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            ${currentBalance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden bg-white p-0">
                    <div className="w-full h-full flex flex-col">
                        <SupplierCheckingAccountManager
                            supplierId={supplier.id}
                            organizationId={orgId}
                            slug={slug}
                            onBalanceChange={setCurrentBalance}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
