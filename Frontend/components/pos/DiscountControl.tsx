import { useState, useEffect, useRef } from 'react'
import { Percent, DollarSign, Calculator, ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Props {
    onApplyAdjustment: (type: 'PERCENT' | 'FIXED', value: number) => void
    onRound: (type: 'UP' | 'DOWN' | 'NEAREST' | 'MANUAL', value?: number) => void
    currentAdjustment?: { type: 'PERCENT' | 'FIXED', value: number }
    currentRounding?: number
}

export function DiscountControl({ onApplyAdjustment, onRound, currentAdjustment, currentRounding }: Props) {
    const [value, setValue] = useState('')
    const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
    const [roundingInput, setRoundingInput] = useState('')
    const [isRoundingOpen, setIsRoundingOpen] = useState(false)
    const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
    const adjInputRef = useRef<HTMLInputElement>(null)
    const roundInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isAdjustmentOpen) {
            setTimeout(() => adjInputRef.current?.focus(), 100)
        }
    }, [isAdjustmentOpen])

    useEffect(() => {
        if (isRoundingOpen) {
            setTimeout(() => roundInputRef.current?.focus(), 100)
        }
    }, [isRoundingOpen])

    useEffect(() => {
        if (currentRounding !== undefined) {
            setRoundingInput(currentRounding === 0 ? '' : currentRounding.toString())
        }
    }, [currentRounding])

    const apply = () => {
        const val = parseFloat(value)
        if (isNaN(val)) return
        onApplyAdjustment(type, val)
        setValue('')
    }

    const handleRoundingChange = (val: string) => {
        setRoundingInput(val)
        const num = parseFloat(val)
        if (!isNaN(num)) {
            onRound('MANUAL', num)
        } else if (val === '' || val === '-') {
            // Allow typing empty or minus without resetting to 0 immediately, but maybe send 0?
            // User wants live update. If empty, maybe 0.
            if (val === '') onRound('MANUAL', 0)
        }
    }

    const roundingValue = parseFloat(roundingInput) || 0
    const roundingColor = roundingValue > 0 ? 'text-red-500 border-red-200 focus-visible:ring-red-200' : (roundingValue < 0 ? 'text-emerald-500 border-emerald-200 focus-visible:ring-emerald-200' : '')

    const adjValue = currentAdjustment?.value || 0
    const adjColor = adjValue > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"

    return (
        <div className="flex flex-col gap-3 w-full">
            <Popover open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full h-12 text-sm justify-between px-4 rounded-xl border-slate-200 hover:bg-slate-50 transition-all font-black uppercase tracking-widest", currentAdjustment ? adjColor : "text-slate-500")}>
                        <div className="flex items-center gap-2">
                            <Percent size={14} className="text-slate-400" />
                            <span>Ajuste General</span>
                        </div>
                        {currentAdjustment && (
                            <span className="bg-white/50 px-2 py-0.5 rounded-lg text-xs">
                                {currentAdjustment.value > 0 ? '+' : ''}{currentAdjustment.value}{currentAdjustment.type === 'PERCENT' ? '%' : '$'}
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="start">
                    <div className="space-y-3">
                        <h4 className="font-bold text-xs uppercase text-slate-500">Ajuste General</h4>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setType('PERCENT')} className={cn("flex-1 py-1 text-xs font-bold rounded-md transition-all", type === 'PERCENT' ? "bg-white shadow" : "text-slate-500")}>% Porc.</button>
                            <button onClick={() => setType('FIXED')} className={cn("flex-1 py-1 text-xs font-bold rounded-md transition-all", type === 'FIXED' ? "bg-white shadow" : "text-slate-500")}>$ Fijo</button>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                ref={adjInputRef}
                                type="number"
                                placeholder={type === 'PERCENT' ? "Ej: 10" : "Ej: 1000"}
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                className="h-9 w-full"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        apply()
                                        setIsAdjustmentOpen(false)
                                    }
                                }}
                            />
                        </div>
                        <div className="flex gap-2 mt-3">
                            {currentAdjustment && (
                                <Button size="sm" variant="ghost" onClick={() => { onApplyAdjustment('FIXED', 0); setIsAdjustmentOpen(false); }} className="flex-1 text-red-500 hover:bg-red-50 h-7 text-xs">Quitar</Button>
                            )}
                            <Button size="sm" onClick={() => { apply(); setIsAdjustmentOpen(false); }} className="flex-1 bg-slate-900 h-7 text-xs text-white">Guardar</Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <Popover open={isRoundingOpen} onOpenChange={setIsRoundingOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full h-12 text-sm justify-between px-4 rounded-xl border-slate-200 hover:bg-slate-50 transition-all font-black uppercase tracking-widest", (currentRounding !== undefined && currentRounding !== 0) ? (currentRounding > 0 ? "text-red-600 bg-red-50 border-red-100" : "text-emerald-600 bg-emerald-50 border-emerald-100") : "text-slate-500")}>
                        <div className="flex items-center gap-2">
                            <Calculator size={14} className="text-slate-400" />
                            <span>Redondeo Manual</span>
                        </div>
                        {(currentRounding !== undefined && currentRounding !== 0) && (
                            <span className="bg-white/50 px-2 py-0.5 rounded-lg text-xs">
                                {currentRounding > 0 ? `+${currentRounding}` : currentRounding}
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-3" align="start">
                    <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">Redondeo</h4>
                    <Input
                        ref={roundInputRef}
                        type="number"
                        placeholder="Ej: 0.00"
                        className={cn("h-9 font-bold text-base", roundingColor)}
                        value={roundingInput}
                        onChange={(e) => handleRoundingChange(e.target.value)}
                    />
                    <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
                        <span className={roundingValue < 0 ? "text-emerald-600" : ""}>Descuento</span>
                        <span className={roundingValue > 0 ? "text-red-600" : ""}>Recargo</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                        {currentRounding !== 0 && (
                            <Button size="sm" variant="ghost" onClick={() => { onRound('MANUAL', 0); setIsRoundingOpen(false); }} className="flex-1 text-red-500 hover:bg-red-50 h-7 text-xs">Quitar</Button>
                        )}
                        <Button size="sm" onClick={() => setIsRoundingOpen(false)} className="flex-1 bg-slate-900 h-7 text-xs text-white">Guardar</Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
