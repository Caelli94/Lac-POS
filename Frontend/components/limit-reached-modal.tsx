'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Phone, ArrowUpCircle } from "lucide-react"

interface LimitReachedModalProps {
    isOpen: boolean
    onClose: () => void
    limitType?: 'users' | 'products' | 'suppliers' | 'customers' | 'generic'
}

export function LimitReachedModal({ isOpen, onClose, limitType = 'generic' }: LimitReachedModalProps) {

    const getMessage = () => {
        switch (limitType) {
            case 'users': return "Ha alcanzado el límite de usuarios permitidos en su plan actual.";
            case 'products': return "Ha alcanzado el límite de productos que puede registrar.";
            case 'suppliers': return "Ha alcanzado el límite de proveedores en su cartera.";
            case 'customers': return "Ha alcanzado el límite de clientes en su cartera.";
            default: return "Ha alcanzado un límite operativo de su plan.";
        }
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="border-red-100 bg-white">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 text-red-600 mb-2">
                        <ArrowUpCircle size={24} />
                        <AlertDialogTitle className="text-xl">Límite del Plan Alcanzado</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription asChild>
                        <div className="text-slate-600 text-base space-y-4">
                            <p>{getMessage()}</p>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <p className="font-medium text-slate-800 mb-1">¿Necesita más capacidad?</p>
                                <p className="text-sm text-slate-500 mb-3">Por favor aumente su plan, o comuníquese con el Representante.</p>
                                <div className="flex items-center gap-2 text-slate-900 font-bold bg-white px-3 py-2 rounded border border-slate-200 w-fit">
                                    <Phone size={16} className="text-green-600" />
                                    <span>Luciano: +54 9 358 426-8920</span>
                                </div>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>Entendido</AlertDialogCancel>
                    <AlertDialogAction className="bg-green-600 hover:bg-green-700" onClick={() => window.open('https://wa.me/5493584268920', '_blank')}>
                        Contactar por WhatsApp
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
