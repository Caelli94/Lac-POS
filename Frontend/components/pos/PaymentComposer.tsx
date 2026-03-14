'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, CreditCard, Banknote, ArrowRightLeft, Wallet, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Payment {
    method: 'cash' | 'credit_card' | 'debit_card' | 'transfer' | 'check' | 'ACCOUNT'
    amount: number
}

interface Props {
    totalAmount: number
    onPaymentsChange: (payments: Payment[]) => void
    customer: any // Customer object to check account status
}

export function PaymentComposer({ totalAmount, onPaymentsChange, customer }: Props) {
    console.log("DEBUG: PaymentComposer Customer:", customer);
    const [payments, setPayments] = useState<Payment[]>([])
    const [currentMethod, setCurrentMethod] = useState<Payment['method']>('cash')
    const [currentAmount, setCurrentAmount] = useState<string>('')

    // Reset payments when total changes significantly? No, maybe just validate.
    // Actually, for a simple flow, we might want to default to Full Cash if empty.
    useEffect(() => {
        if (payments.length === 0) {
            // Optional: Auto-fill with cash?
            // setPayments([{ method: 'cash', amount: totalAmount }])
        }
    }, [totalAmount])

    useEffect(() => {
        onPaymentsChange(payments)
    }, [payments, onPaymentsChange])

    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = totalAmount - paidAmount
    // If remaining is 0 or negative (change), it's fully paid
    const isFullyPaid = remaining <= 0.01

    // Update the input to match remaining by default if empty
    useEffect(() => {
        if (remaining > 0) {
            setCurrentAmount(remaining.toFixed(2))
        } else {
            setCurrentAmount('')
        }
    }, [payments, totalAmount])

    const addPayment = () => {
        const val = parseFloat(currentAmount)
        if (isNaN(val) || val <= 0) return

        // Prevent non-cash overpayment? Optional, but for now just allow user to define amount.
        // If they enter 200 for 100 debt, it means change is 100.

        setPayments(prev => {
            const existingIndex = prev.findIndex(p => p.method === currentMethod)
            if (existingIndex >= 0) {
                // Merge with existing
                const newPayments = [...prev]
                newPayments[existingIndex] = {
                    ...newPayments[existingIndex],
                    amount: newPayments[existingIndex].amount + val
                }
                return newPayments
            }
            // Add new
            return [...prev, { method: currentMethod, amount: val }]
        })
        // setCurrentAmount('') // Will verify via effect
    }

    const removePayment = (index: number) => {
        setPayments(prev => prev.filter((_, i) => i !== index))
    }

    const isAccountDisabled = !customer || !customer.current_account_active;

    const methods = [
        { id: 'cash', label: 'Efectivo', icon: Banknote, color: 'indigo' },
        { id: 'credit_card', label: 'Crédito', icon: CreditCard, color: 'purple' },
        { id: 'debit_card', label: 'Débito', icon: CreditCard, color: 'pink' },
        { id: 'transfer', label: 'Transf.', icon: ArrowRightLeft, color: 'blue' },
        { id: 'check', label: 'Cheque', icon: Banknote, color: 'orange' },
        { id: 'ACCOUNT', label: 'Cta. Cte.', icon: Wallet, color: 'slate' }
    ].filter(m => m.id !== 'ACCOUNT' || !isAccountDisabled)

    return (
        <div className="space-y-4">
            {/* Summary of Payments */}
            <div className="space-y-2">
                {payments.map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200 text-sm animate-in slide-in-from-left-2">
                        <div className="flex items-center gap-2">
                            <span className="uppercase font-bold text-xs text-slate-500">{methods.find(m => m.id === p.method)?.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">${p.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                            <button onClick={() => removePayment(idx)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            {!isFullyPaid && (
                <div className="p-3 bg-slate-100 rounded-xl space-y-3">
                    <div className="grid grid-cols-5 gap-2">
                        {methods.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setCurrentMethod(m.id as any)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-lg text-[10px] font-bold h-12 transition-all border",
                                    currentMethod === m.id
                                        ? `bg-white border-${m.color}-500 text-${m.color}-600 shadow-sm ring-1 ring-${m.color}-200`
                                        : "bg-slate-200/50 text-slate-400 border-transparent hover:bg-white"
                                )}
                            >
                                <m.icon size={16} />
                                {m.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            value={currentAmount}
                            onChange={e => setCurrentAmount(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addPayment() }}
                            className="bg-white font-bold text-lg"
                            placeholder="Monto"
                            autoFocus
                        />
                        <Button onClick={addPayment} disabled={parseFloat(currentAmount) <= 0} className="w-12 bg-slate-900 hover:bg-black"><Plus size={18} /></Button>
                    </div>
                </div>
            )}

            {/* Remaining Label */}
            <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-bold text-slate-400 uppercase">
                    {remaining < -0.01 ? 'Vuelto (A entregar)' : 'Faltante'}
                </span>
                <span className={cn("text-xl font-black", remaining > 0 ? "text-red-500" : "text-emerald-500")}>
                    {remaining < -0.01
                        ? (Math.abs(remaining)).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
                        : (remaining > 0 ? remaining : 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
                    }
                </span>
            </div>
        </div>
    )
}
