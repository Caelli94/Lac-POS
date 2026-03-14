'use client'

import { useState } from 'react'
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { toggleCheckingAccount } from '@/app/[slug]/customers/actions'

interface Props {
    customerId: string
    orgId: string
    initialIsActive: boolean
    initialLimit: number
}

export function AccountSettings({ customerId, orgId, initialIsActive, initialLimit }: Props) {
    const [isActive, setIsActive] = useState(initialIsActive)
    const [limit, setLimit] = useState(initialLimit)
    const [loading, setLoading] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // Detectar cambios en el Switch
    const handleSwitch = (checked: boolean) => {
        setIsActive(checked)
        setHasChanges(true)
    }

    // Detectar cambios en el Límite
    const handleLimitChange = (val: string) => {
        setLimit(Number(val))
        setHasChanges(true)
    }

    // Guardar en la base de datos
    const handleSave = async () => {
        setLoading(true)
        const result = await toggleCheckingAccount(customerId, orgId, isActive, limit)
        setLoading(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(isActive ? "Cuenta Habilitada" : "Cuenta Deshabilitada")
            setHasChanges(false)
        }
    }

    return (
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6 mb-6">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="text-base font-semibold text-slate-900">Habilitar Cuenta Corriente</Label>
                    <p className="text-sm text-slate-500">
                        Permite a este cliente comprar fiado en el POS.
                    </p>
                </div>
                <Switch
                    checked={isActive}
                    onCheckedChange={handleSwitch}
                />
            </div>

            {/* Solo mostramos el límite si está activo */}
            {isActive && (
                <div className="pt-4 border-t animate-in fade-in slide-in-from-top-2">
                    <Label className="mb-2 block text-sm font-medium text-slate-700">Límite de Crédito ($)</Label>
                    <div className="flex gap-4 items-center">
                        <Input
                            type="number"
                            value={limit}
                            onChange={(e) => handleLimitChange(e.target.value)}
                            className="max-w-[200px]"
                        />
                        <span className="text-xs text-slate-400">
                            (El sistema avisará si supera este monto)
                        </span>
                    </div>
                </div>
            )}

            {/* Botón de guardar solo si hubo cambios */}
            {hasChanges && (
                <div className="flex justify-end pt-2">
                    <Button onClick={handleSave} disabled={loading} className="bg-slate-900 text-white">
                        {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </div>
            )}
        </div>
    )
}