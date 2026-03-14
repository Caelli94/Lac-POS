'use client'

import { useState, useTransition } from 'react'
import { updateSettingsAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface SettingsFormProps {
    org: {
        id: string
        name: string
        slug: string
        address: string | null
        phone: string | null
        tax_id: string | null
        email_contact: string | null
        settings?: {
            disabled_tabs?: string[]
        }
    }
}

export function SettingsForm({ org }: SettingsFormProps) {
    const [isPending, startTransition] = useTransition()

    // 1. CAMBIO CLAVE: Usamos .bind para pre-cargar los IDs.
    // Esto evita que Next.js mezcle los argumentos y genere claves raras como '1_tax_id'.
    const updateWithId = updateSettingsAction.bind(null, org.id, org.slug)

    // ----------------------------------------------------------------------
    // LOGIC: Handle Legacy 'avatar' vs New 'customer_avatar/supplier_avatar'
    // ----------------------------------------------------------------------
    const rawDisabled = org.settings?.disabled_tabs || [];

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        // No longer modifying disabled_tabs from here, preserving original ones.
        formData.set('disabled_tabs', JSON.stringify(rawDisabled));

        startTransition(async () => {
            const result = await updateWithId(formData)
            if (result.error) toast.error(result.error)
            else toast.success(result.success)
        })
    }

    return (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="flex flex-col gap-1 mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">🏢 Datos Generales</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Información básica de tu comercio.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Fila 1: Nombre y CUIT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del Negocio</Label>
                        <Input
                            disabled
                            defaultValue={org.name}
                            className="bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tax_id">Identificación Fiscal (CUIT / RUT)</Label>
                        <Input
                            id="tax_id"
                            name="tax_id"
                            placeholder="Ej: 20-12345678-9"
                            defaultValue={org.tax_id || ''}
                        />
                    </div>
                </div>

                {/* Fila 2: Dirección */}
                <div className="space-y-2">
                    <Label htmlFor="address">Dirección del Local</Label>
                    <Input
                        id="address"
                        name="address"
                        placeholder="Ej: Av. San Martín 1234, Córdoba"
                        defaultValue={org.address || ''}
                    />
                </div>

                {/* Fila 3: Contacto */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                        <Input
                            id="phone"
                            name="phone"
                            placeholder="+54 9 351 ..."
                            defaultValue={org.phone || ''}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email_contact">Email de Contacto</Label>
                        <Input
                            id="email_contact"
                            name="email_contact"
                            type="email"
                            placeholder="contacto@tuempresa.com"
                            defaultValue={org.email_contact || ''}
                        />
                    </div>
                </div>


                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isPending} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl">
                        {isPending ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </form>
        </div>
    )
}