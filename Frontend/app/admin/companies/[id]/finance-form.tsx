'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Calendar, Wallet, CreditCard, DollarSign, Clock, Save, Loader2 } from "lucide-react"
import { updateOrganizationAction } from "./actions"

interface Props {
    orgId: string
    subscriptionDetails: any
}

export function FinanceForm({ orgId, subscriptionDetails }: Props) {
    const [isPending, startTransition] = useTransition()

    // Convert date for input type="date"
    const formatDate = (date: any) => {
        if (!date) return ''
        const d = new Date(date)
        return d.toISOString().split('T')[0]
    }

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            const data = {
                subscription_details: {
                    start_date: formData.get('start_date'),
                    period: formData.get('period'),
                    amount: Number(formData.get('amount')),
                    currency: formData.get('currency'),
                    payment_method: formData.get('payment_method'),
                    next_due_date: formData.get('next_due_date'),
                    notes: formData.get('notes'),
                }
            }

            try {
                const res = await updateOrganizationAction(orgId, data)
                if (res.success) {
                    toast.success("Detalles financieros actualizados")
                } else {
                    toast.error(res.error || "Error al actualizar")
                }
            } catch (error) {
                toast.error("Error inesperado")
            }
        })
    }

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                    <Wallet size={20} className="text-slate-900" />
                    Finanzas y Suscripción
                </CardTitle>
                <CardDescription>
                    Gestiona el ciclo de facturación, precios y condiciones comerciales para este cliente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* CICLO DE INICIO */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Calendar size={14} /> Fecha de Inicio de Ciclo
                            </Label>
                            <Input
                                name="start_date"
                                type="date"
                                defaultValue={formatDate(subscriptionDetails?.start_date)}
                                className="h-11 font-bold"
                            />
                        </div>

                        {/* PERIODO */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Clock size={14} /> Período de Cobro
                            </Label>
                            <Select name="period" defaultValue={subscriptionDetails?.period || 'monthly'}>
                                <SelectTrigger className="h-11 font-bold">
                                    <SelectValue placeholder="Seleccionar período" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Mensual</SelectItem>
                                    <SelectItem value="quarterly">Trimestral</SelectItem>
                                    <SelectItem value="semiannual">Semestral</SelectItem>
                                    <SelectItem value="yearly">Anual</SelectItem>
                                    <SelectItem value="lifetime">Vitalicio / Único</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* MONTO */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <DollarSign size={14} /> Importe del Abono
                            </Label>
                            <div className="flex gap-2 items-center">
                                <Select name="currency" defaultValue={subscriptionDetails?.currency || 'ARS'}>
                                    <SelectTrigger className="w-32 h-11 font-bold bg-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ARS">ARS</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    name="amount"
                                    type="number"
                                    defaultValue={subscriptionDetails?.amount || 0}
                                    placeholder="0.00"
                                    className="h-11 font-bold bg-white flex-1"
                                />
                            </div>
                        </div>

                        {/* MÉTODO DE PAGO */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <CreditCard size={14} /> Método de Pago Preferido
                            </Label>
                            <Input
                                name="payment_method"
                                defaultValue={subscriptionDetails?.payment_method || ''}
                                placeholder="Efectivo, Transferencia, Tarjeta..."
                                className="h-11 font-bold"
                            />
                        </div>

                        {/* PRÓXIMO VENCIMIENTO */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Calendar size={14} className="text-red-500" /> Próximo Vencimiento
                            </Label>
                            <Input
                                name="next_due_date"
                                type="date"
                                defaultValue={formatDate(subscriptionDetails?.next_due_date)}
                                className="h-11 font-bold border-red-100 bg-red-50/20"
                            />
                        </div>

                    </div>

                    {/* NOTAS ADICIONALES */}
                    <div className="space-y-2 border-t pt-6">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notas / Comentarios Internos</Label>
                        <Textarea
                            name="notes"
                            defaultValue={subscriptionDetails?.notes || ''}
                            placeholder="Detalles sobre acuerdos especiales, bonificaciones, etc."
                            className="min-h-[100px] font-medium"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <Button
                            type="submit"
                            disabled={isPending}
                            className="bg-slate-900 hover:bg-black text-white px-8 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 gap-2"
                        >
                            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Guardar Configuración Financiera
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
