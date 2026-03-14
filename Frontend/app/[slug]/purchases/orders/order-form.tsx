'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { createOrderAction, updateOrderAction } from "./actions"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"



import { AsyncCustomerSearch } from "./components/async-customer-search"

const formSchema = z.object({
    customer_id: z.string().optional().nullable(),
    customer_name: z.string().optional(),
    product_name: z.string().min(2, "El nombre del producto es requerido"),
    quantity: z.coerce.number().min(1, "La cantidad debe ser al menos 1"),
    details: z.string().optional(),
    deposit_amount: z.coerce.number().min(0).optional(),
    payment_method: z.string().optional(),
    expected_date: z.date().optional(),
    status: z.enum(['PENDING', 'ORDERED', 'ARRIVED', 'DELIVERED', 'CANCELLED']).optional(),
}).refine(data => data.customer_id || data.customer_name, {
    message: "Debe seleccionar un cliente o ingresar un nombre",
    path: ["customer_id"],
})

interface Props {
    orgId: string
    slug: string
    initialData?: any
    customers: any[]
    onSuccess?: () => void
    onCancel: () => void
}

export function OrderForm({ orgId, slug, initialData, customers, onSuccess, onCancel }: Props) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            customer_id: initialData?.customer_id || initialData?.customer?._id || null,
            customer_name: initialData?.customer_name || initialData?.customer?.name || "",
            product_name: initialData?.product_name || "",
            quantity: initialData?.quantity || 1,
            details: initialData?.details || "",
            deposit_amount: initialData?.deposit_amount || 0,
            payment_method: initialData?.payment_method || "Efectivo",
            expected_date: initialData?.expected_date ? new Date(initialData.expected_date) : undefined,
            status: initialData?.status || 'PENDING',
        },
    })

    const watchDeposit = form.watch("deposit_amount") as number;
    const isCancelled = form.watch("status") === 'CANCELLED';

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true)
        try {
            const payload = {
                ...values,
                organization_id: orgId,
            }

            let res;
            if (initialData) {
                res = await updateOrderAction(initialData.id || initialData._id, payload, slug)
            } else {
                res = await createOrderAction(payload, slug)
            }

            if (res.success) {
                toast.success(initialData ? "Encargue actualizado" : "Encargue creado")
                onSuccess?.()
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full bg-slate-50/50">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

                    {/* CUSTOMER */}
                    <div className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase text-slate-500">Cliente</FormLabel>
                        <FormControl>
                            <AsyncCustomerSearch
                                orgId={orgId}
                                initialCustomerId={form.getValues('customer_id')}
                                initialCustomerName={form.getValues('customer_name')}
                                onSelect={(c) => {
                                    form.setValue('customer_id', c.id);
                                    form.setValue('customer_name', c.name);
                                    form.clearErrors('customer_id');
                                }}
                                disabled={isCancelled}
                            />
                        </FormControl>
                        <FormMessage>
                            {form.formState.errors.customer_id?.message}
                        </FormMessage>
                    </div>

                    {/* PRODUCT */}
                    <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="product_name"
                            render={({ field }) => (
                                <FormItem className="col-span-2">
                                    <FormLabel className="text-xs font-black uppercase text-slate-500">Producto / Descripción</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Ej: Taladro Manual Makita..." className="bg-white border-slate-200 h-11 rounded-xl" disabled={isCancelled} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase text-slate-500">Cantidad</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value as number} type="number" min="1" className="bg-white border-slate-200 h-11 rounded-xl text-center font-bold" disabled={isCancelled} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* PAYMENT & MONEY */}
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="deposit_amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase text-slate-500">Seña / Adelanto ($)</FormLabel>
                                    <FormControl>
                                        <Input {...field} value={field.value as number} type="number" min="0" className="bg-white border-slate-200 h-11 rounded-xl text-right font-mono" placeholder="0.00" disabled={isCancelled} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="payment_method"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase text-slate-500">Método de Pago (Seña)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        disabled={watchDeposit <= 0 || isCancelled}
                                    >
                                        <FormControl>
                                            <SelectTrigger className={cn(
                                                "bg-white border-slate-200 h-11 rounded-xl font-bold",
                                                watchDeposit <= 0 && "opacity-50 grayscale"
                                            )}>
                                                <SelectValue placeholder="Seleccionar método" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Efectivo">EFECTIVO</SelectItem>
                                            <SelectItem value="Transferencia">TRANSFERENCIA</SelectItem>
                                            <SelectItem value="Tarjeta de Débito">TARJETA DE DÉBITO</SelectItem>
                                            <SelectItem value="Tarjeta de Crédito">TARJETA DE CRÉDITO</SelectItem>
                                            <SelectItem value="Mercado Pago">MERCADO PAGO</SelectItem>
                                            <SelectItem value="Otros">OTROS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* DATES & STATUS */}
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="expected_date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="text-xs font-black uppercase text-slate-500">Fecha Estimada</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    disabled={isCancelled}
                                                    className={cn(
                                                        "w-full h-11 pl-3 text-left font-normal bg-white border-slate-200 rounded-xl",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP", { locale: es })
                                                    ) : (
                                                        <span>Seleccionar fecha</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date < new Date(new Date().setHours(0, 0, 0, 0))
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-black uppercase text-slate-500">Estado</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isCancelled}>
                                        <FormControl>
                                            <SelectTrigger className="bg-white border-slate-200 h-11 rounded-xl font-bold">
                                                <SelectValue placeholder="Estado" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="PENDING">PENDIENTE</SelectItem>
                                            <SelectItem value="ORDERED">PEDIDO</SelectItem>
                                            <SelectItem value="ARRIVED">RECIBIDO</SelectItem>
                                            <SelectItem value="DELIVERED">ENTREGADO</SelectItem>
                                            <SelectItem value="CANCELLED">CANCELADO</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* DETAILS */}
                    <FormField
                        control={form.control}
                        name="details"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-black uppercase text-slate-500">Notas / Detalles</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        placeholder="Color, marca específica, link de referencia..."
                                        className="bg-white border-slate-200 rounded-xl resize-none min-h-[100px]"
                                        disabled={isCancelled}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                </div>

                <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl font-bold uppercase text-xs h-11 px-6">
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting || isCancelled} className="rounded-xl font-black uppercase text-xs h-11 px-8 bg-slate-900 hover:bg-black text-white shadow-lg shadow-slate-900/20">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : (initialData ? "Guardar Cambios" : "Crear Encargue")}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
