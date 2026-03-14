'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Printer, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updateTicketSettingsAction } from './actions'
import { TicketPreview } from './ticket-preview'

// Definición de Tipos
interface OrganizationData {
    id: string;
    name: string;
    tax_id?: string | null;
    address?: string | null;
    [key: string]: any;
}

interface TicketSettingsData {
    business_name?: string;
    tax_id?: string;
    address?: string;
    header_text?: string;
    footer_text?: string;
    printer_width?: '80mm' | '58mm';
    use_general_data?: boolean;
}

interface Props {
    org: OrganizationData;
    slug: string;
    initialData: TicketSettingsData | null;
}

export function TicketSettingsForm({ org, slug, initialData }: Props) {
    const [isPending, startTransition] = useTransition()

    const [useGeneralData, setUseGeneralData] = useState(initialData?.use_general_data || false)

    const [formData, setFormData] = useState({
        business_name: initialData?.business_name || '',
        tax_id: initialData?.tax_id || '',
        address: initialData?.address || '',
        header_text: initialData?.header_text || '',
        footer_text: initialData?.footer_text || '',
        printer_width: (initialData?.printer_width as '80mm' | '58mm') || '80mm',
        use_general_data: initialData?.use_general_data || false
    })

    // Sincronizar datos si el switch está activado y cambian los props de la org
    useEffect(() => {
        if (useGeneralData) {
            setFormData(prev => ({
                ...prev,
                business_name: org.name || '',
                tax_id: org.tax_id || '',
                address: org.address || ''
            }));
        }
    }, [useGeneralData, org]);

    const handleSwitchChange = (checked: boolean) => {
        setUseGeneralData(checked);
        setFormData(prev => ({ ...prev, use_general_data: checked }));

        if (checked) {
            setFormData(prev => ({
                ...prev,
                business_name: org.name || '',
                tax_id: org.tax_id || '',
                address: org.address || ''
            }));
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            const dataToSend = {
                ...formData,
                use_general_data: useGeneralData
            };

            const result = await updateTicketSettingsAction(org.id, slug, dataToSend)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Configuración guardada correctamente")
            }
        })
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Columna Izquierda: Formulario (2/3) */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-800">
                        <Printer className="h-5 w-5 text-slate-900" />
                        Diseño del Ticket
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Personaliza la información impresa en los comprobantes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Switch */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="space-y-0.5">
                                <Label className="text-base">Usar Información General</Label>
                                <p className="text-sm text-slate-500">
                                    Copiar automáticamente nombre, CUIT y dirección.
                                </p>
                            </div>
                            <Switch
                                checked={useGeneralData}
                                onCheckedChange={handleSwitchChange}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Nombre de Fantasía</Label>
                                <Input
                                    placeholder="Ej: Mi Negocio"
                                    value={formData.business_name}
                                    onChange={(e) => handleChange('business_name', e.target.value)}
                                    disabled={useGeneralData}
                                    className={useGeneralData ? "bg-slate-100 text-slate-500" : ""}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>CUIT / RUT</Label>
                                <Input
                                    placeholder="Ej: 20-12345678-9"
                                    value={formData.tax_id}
                                    onChange={(e) => handleChange('tax_id', e.target.value)}
                                    disabled={useGeneralData}
                                    className={useGeneralData ? "bg-slate-100 text-slate-500" : ""}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Dirección</Label>
                            <Input
                                placeholder="Calle Falsa 123"
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                disabled={useGeneralData}
                                className={useGeneralData ? "bg-slate-100 text-slate-500" : ""}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Mensaje de Encabezado</Label>
                                <Input
                                    placeholder="Ej: ¡Bienvenidos!"
                                    value={formData.header_text}
                                    onChange={(e) => handleChange('header_text', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Ancho de Papel</Label>
                                <Select
                                    value={formData.printer_width}
                                    onValueChange={(val) => handleChange('printer_width', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar ancho" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="80mm">80mm (Estándar)</SelectItem>
                                        <SelectItem value="58mm">58mm (Pequeño)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Pie de Página</Label>
                            <Textarea
                                placeholder="Ej: Gracias por su compra."
                                className="resize-none"
                                value={formData.footer_text}
                                onChange={(e) => handleChange('footer_text', e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={isPending} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl">
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Configuración
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>

            {/* Columna Derecha: Preview (1/3) */}
            <div className="lg:col-span-1 sticky top-8">
                <TicketPreview settings={formData} />
                <p className="text-center text-xs text-slate-400 mt-4">
                    Esta es una vista previa aproximada. El resultado final puede variar según la impresora.
                </p>
            </div>
        </div>
    )
}