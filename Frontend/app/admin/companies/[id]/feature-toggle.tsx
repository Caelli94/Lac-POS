'use client'

import { Switch } from "@/components/ui/switch"
import { useState, useTransition } from "react"
import { toggleFeatureAction } from "./actions"
import { Loader2 } from "lucide-react"

interface Props {
    organizationId: string
    featureCode: string
    isEnabled: boolean
}

export function FeatureToggle({ organizationId, featureCode, isEnabled }: Props) {
    const [isPending, startTransition] = useTransition()
    // Estado local para respuesta instantánea (Optimistic UI)
    const [active, setActive] = useState(isEnabled)

    const handleToggle = (checked: boolean) => {
        setActive(checked) // Cambiamos visualmente al instante

        startTransition(async () => {
            try {
                await toggleFeatureAction(organizationId, featureCode, checked)
            } catch (error) {
                // Si falla, revertimos el cambio
                setActive(!checked)
                alert("Error al guardar los cambios")
            }
        })
    }

    return (
        <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${active ? 'text-green-600' : 'text-slate-400'}`}>
                {active ? 'ACTIVO' : 'INACTIVO'}
            </span>

            <div className="relative">
                <Switch
                    checked={active}
                    onCheckedChange={handleToggle}
                    disabled={isPending}
                    className={active ? "bg-green-600" : "bg-slate-200"}
                />
                {/* Indicador de carga sutil si está guardando */}
                {isPending && (
                    <div className="absolute -right-6 top-1">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    </div>
                )}
            </div>
        </div>
    )
}