'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateSettingsAction } from "./actions"
import { toast } from "sonner"
import { Users, Package, Truck, Contact, MapPin, Tags, Calculator } from "lucide-react"

interface Props {
    orgId: string
    settings: any
}

export function LimitsForm({ orgId, settings }: Props) {
    const [isPending, startTransition] = useTransition()

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            const updates = {
                ...settings,
                users_limit: Number(formData.get('users_limit')),
                products_limit: Number(formData.get('products_limit')),
                suppliers_limit: Number(formData.get('suppliers_limit')),
                customers_limit: Number(formData.get('customers_limit')),
                price_lists_limit: Number(formData.get('price_lists_limit')),
                branches_limit: Number(formData.get('branches_limit')),
                pos_limit: Number(formData.get('pos_limit')),
            }

            try {
                await updateSettingsAction(orgId, updates)
                toast.success("Límites actualizados correctamente")
            } catch (error) {
                toast.error("Error al actualizar límites")
            }
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Límites y Prestaciones</CardTitle>
                <CardDescription>Define las cuotas operativas para este cliente.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* USUARIOS */}
                        <div className="space-y-2">
                            <Label htmlFor="users_limit" className="flex items-center gap-2">
                                <Users size={16} className="text-slate-500" />
                                Límite de Usuarios
                            </Label>
                            <Input
                                id="users_limit"
                                name="users_limit"
                                type="number"
                                defaultValue={settings?.users_limit ?? 5}
                                min="-1"
                            />
                            <p className="text-[10px] text-slate-400">Usuarios que pueden acceder al sistema (-1 = Ilimitado)</p>
                        </div>

                        {/* PRODUCTOS */}
                        <div className="space-y-2">
                            <Label htmlFor="products_limit" className="flex items-center gap-2">
                                <Package size={16} className="text-slate-500" />
                                Límite de Productos
                            </Label>
                            <Input
                                id="products_limit"
                                name="products_limit"
                                type="number"
                                defaultValue={settings?.products_limit ?? 100}
                                min="-1"
                            />
                            <p className="text-[10px] text-slate-400">Cantidad máxima de items en inventario</p>
                        </div>

                        {/* PROVEEDORES */}
                        <div className="space-y-2">
                            <Label htmlFor="suppliers_limit" className="flex items-center gap-2">
                                <Truck size={16} className="text-slate-500" />
                                Límite de Proveedores
                            </Label>
                            <Input
                                id="suppliers_limit"
                                name="suppliers_limit"
                                type="number"
                                defaultValue={settings?.suppliers_limit ?? 20}
                                min="-1"
                            />
                            <p className="text-[10px] text-slate-400">Cartera máxima de proveedores</p>
                        </div>

                        {/* CLIENTES */}
                        <div className="space-y-2">
                            <Label htmlFor="customers_limit" className="flex items-center gap-2">
                                <Contact size={16} className="text-slate-500" />
                                Límite de Clientes
                            </Label>
                            <Input
                                id="customers_limit"
                                name="customers_limit"
                                type="number"
                                defaultValue={settings?.customers_limit ?? 50}
                                min="-1"
                            />
                            <p className="text-[10px] text-slate-400">Cartera máxima de clientes</p>
                        </div>

                        {/* SUCURSALES */}
                        <div className="space-y-2">
                            <Label htmlFor="branches_limit" className="flex items-center gap-2">
                                <MapPin size={16} className="text-slate-500" />
                                Límite de Sucursales
                            </Label>
                            <Input
                                id="branches_limit"
                                name="branches_limit"
                                type="number"
                                defaultValue={settings?.branches_limit ?? 1}
                                min="-1"
                            />
                            <p className="text-[10px] text-slate-400">Cantidad máxima de sucursales permitidas</p>
                        </div>

                        {/* PUNTOS DE VENTA (CAJAS) */}
                        <div className="space-y-2">
                            <Label htmlFor="pos_limit" className="flex items-center gap-2">
                                <Calculator size={16} className="text-slate-500" />
                                Límite de Puntos de Venta (Cajas)
                            </Label>
                            <Input
                                id="pos_limit"
                                name="pos_limit"
                                type="number"
                                defaultValue={settings?.pos_limit ?? 1}
                                min="-1"
                            />
                            <p className="text-[10px] text-slate-400">Cantidad máxima de cajas/puntos de venta</p>
                        </div>

                        {/* LISTAS DE PRECIOS */}
                        <div className="space-y-2">
                            <Label htmlFor="price_lists_limit" className="flex items-center gap-2">
                                <Tags size={16} className="text-slate-500" />
                                Límite de Listas de Precios
                            </Label>
                            <Input
                                id="price_lists_limit"
                                name="price_lists_limit"
                                type="number"
                                defaultValue={settings?.price_lists_limit ?? 5}
                                min="-1"
                            />
                            <p className="text-[10px] text-slate-400">Cantidad máxima de listas de precios</p>
                        </div>

                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <Button type="submit" disabled={isPending} className="bg-slate-900 text-white font-bold uppercase tracking-widest text-xs">
                            {isPending ? 'Guardando...' : 'Guardar Límites'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
