'use client'

import { useState } from 'react'
import { Check, X, DollarSign, Percent, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface CartItem {
    id: string
    name: string
    price: number
    quantity: number
    discount?: { type: 'PERCENT' | 'FIXED', value: number }
    exclude_from_general_discount?: boolean
    variant_name?: string
}

interface Props {
    item: CartItem
    isOpen: boolean
    onClose: () => void
    onSave: (updates: Partial<CartItem>) => void
    onDelete: () => void
}

export function CartItemEditor({ item, isOpen, onClose, onSave, onDelete }: Props) {
    const [discountValue, setDiscountValue] = useState(item.discount?.value?.toString() || '')
    const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>(item.discount?.type || 'PERCENT')
    const [exclude, setExclude] = useState(item.exclude_from_general_discount || false)

    const handleSave = () => {
        const val = parseFloat(discountValue)
        const discount = (discountValue && !isNaN(val)) ? { type: discountType, value: val } : undefined

        onSave({
            discount,
            exclude_from_general_discount: exclude
        })
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-[320px] bg-white rounded-3xl p-6 shadow-2xl border-0">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-lg font-black tracking-tight text-slate-900 text-center">
                        Editar Ítem
                    </DialogTitle>
                    <p className="text-xs text-slate-500 text-center font-medium line-clamp-2 px-2">
                        {item.name}
                    </p>
                    {item.variant_name && (
                        <div className="flex justify-center mt-1">
                            <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                {item.variant_name}
                            </span>
                        </div>
                    )}
                </DialogHeader>

                <div className="space-y-5">
                    {/* Discount Section */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Ajuste de Precio</Label>
                        <div className="flex bg-slate-100 rounded-2xl p-1.5 ring-1 ring-slate-200">
                            <div className="flex gap-1 shrink-0">
                                <button
                                    onClick={() => setDiscountType('PERCENT')}
                                    className={cn(
                                        "h-9 w-9 flex items-center justify-center rounded-xl transition-all",
                                        discountType === 'PERCENT' ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    <Percent size={14} strokeWidth={3} />
                                </button>
                                <button
                                    onClick={() => setDiscountType('FIXED')}
                                    className={cn(
                                        "h-9 w-9 flex items-center justify-center rounded-xl transition-all",
                                        discountType === 'FIXED' ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    <DollarSign size={14} strokeWidth={3} />
                                </button>
                            </div>
                            <div className="w-px bg-slate-200 my-1 mx-1.5" />
                            <Input
                                type="number"
                                placeholder="0"
                                value={discountValue}
                                onChange={e => setDiscountValue(e.target.value)}
                                className="border-0 bg-transparent h-9 text-right font-bold text-slate-900 placeholder:text-slate-300 focus-visible:ring-0 px-2"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-between px-2 text-[10px] font-medium">
                            <span className="text-emerald-600">Negativo = Descuento</span>
                            <span className="text-red-500">Positivo = Recargo</span>
                        </div>
                    </div>

                    {/* Exclude Checkbox */}
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setExclude(!exclude)}>
                        <Checkbox
                            id="exclude"
                            checked={exclude}
                            onCheckedChange={(c) => setExclude(Boolean(c))}
                            className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                        <label className="text-xs font-bold text-slate-600 cursor-pointer pointer-events-none select-none">
                            Excluir del General
                        </label>
                    </div>
                </div>

                <DialogFooter className="mt-6 flex-row gap-3 sm:justify-between">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDelete}
                        className="h-12 w-12 rounded-2xl text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    >
                        <Trash2 size={20} />
                    </Button>
                    <div className="flex gap-2 w-full">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-2xl border-slate-200 font-bold hover:bg-slate-50"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-black font-bold text-white shadow-lg active:scale-95 transition-all"
                        >
                            Listo
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
