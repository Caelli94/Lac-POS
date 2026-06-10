'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Banknote, Loader2, Check } from "lucide-react"
import { openCashRegister } from '@/app/[slug]/pos/cash-actions'
import { toast } from 'sonner'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

interface CashOpeningModalProps {
    orgId: string
    slug: string
    onOpenSuccess: (register: { id: string; status: string }) => void
}

export default function CashOpeningModal({ orgId, slug, onOpenSuccess }: CashOpeningModalProps) {
    const [amount, setAmount] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(true)

    const handleOpen = async () => {
        const val = parseFloat(amount)
        if (isNaN(val) || val < 0) {
            return toast.error("Ingresá un monto inicial válido.")
        }

        setLoading(true)
        try {
            const res = await (openCashRegister as any)(orgId, val, slug)
            if (res.error) {
                toast.error(res.error)
            } else if (res.register) {
                setIsOpen(false)
                onOpenSuccess(res.register)
                toast.success("Caja abierta correctamente")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al abrir la caja")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="w-[95vw] sm:max-w-sm bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden">
                <div className="p-8 text-center flex flex-col items-center">
                    <div className="mx-auto bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 shadow-inner">
                        <Banknote size={32} />
                    </div>
                    
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">
                            Apertura de Caja
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium text-sm leading-relaxed px-4">
                            Ingresá el efectivo inicial disponible en el cajón para comenzar el turno.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="w-full space-y-6">
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                                <span className="text-xl font-black">$</span>
                            </div>
                            <Input
                                type="number"
                                placeholder="0.00"
                                className="w-full text-3xl h-20 text-center font-black border-slate-100 bg-slate-50/50 rounded-2xl focus:border-indigo-500 focus:ring-indigo-500 transition-all pl-10"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <Button
                            onClick={handleOpen}
                            disabled={loading || !amount}
                            className="w-full h-16 bg-slate-950 hover:bg-black text-white text-sm font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-slate-200 active:scale-[0.98] transition-all group"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>Abrir Caja</span>
                                    <Check className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}