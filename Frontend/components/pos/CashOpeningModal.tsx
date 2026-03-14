'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Banknote, Loader2 } from "lucide-react"
import { openCashRegister } from '@/app/[slug]/pos/cash-actions'
import { toast } from 'sonner'

interface CashOpeningModalProps {
    orgId: string
    slug: string
    onOpenSuccess: (register: { id: string; status: string }) => void
}

export default function CashOpeningModal({ orgId, slug, onOpenSuccess }: CashOpeningModalProps) {
    const [amount, setAmount] = useState<string>('')
    const [loading, setLoading] = useState(false)

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center">
                <div className="mx-auto bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-indigo-600">
                    <Banknote size={32} />
                </div>
                <h2 className="text-xl font-bold mb-2 text-slate-900">Apertura de Caja</h2>
                <p className="text-slate-500 text-sm mb-6">Ingresá el efectivo inicial para comenzar el turno.</p>
                <Input
                    type="number"
                    placeholder="0.00"
                    className="text-3xl h-16 text-center font-bold mb-6 border-indigo-100 focus:border-indigo-500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                />
                <Button
                    onClick={handleOpen}
                    disabled={loading}
                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg"
                >
                    {loading ? <Loader2 className="animate-spin mr-2" /> : 'Abrir Caja'}
                </Button>
            </div>
        </div>
    )
}