'use client'

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings2, Plus, Trash2, Save, Loader2 } from "lucide-react"
import { updateInventorySettingsAction } from "./actions"
import { toast } from "sonner"

interface CustomAttribute {
    name: string;
    type: string;
    options?: string[];
}

interface Props {
    organizationId: string;
    slug: string;
    initialSettings: any;
}

export function InventorySettingsDialog({ organizationId, slug, initialSettings }: Props) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [attributes, setAttributes] = useState<CustomAttribute[]>(
        initialSettings?.inventory?.custom_attributes || []
    )
    const [variantLabels, setVariantLabels] = useState({
        color: initialSettings?.inventory?.variant_labels?.color || 'Color',
        size: initialSettings?.inventory?.variant_labels?.size || 'Talle'
    })

    const handleAddAttribute = () => {
        setAttributes([...attributes, { name: '', type: 'text' }])
    }

    const handleRemoveAttribute = (index: number) => {
        setAttributes(attributes.filter((_, i) => i !== index))
    }

    const handleNameChange = (index: number, value: string) => {
        const newAttributes = [...attributes]
        newAttributes[index].name = value.toUpperCase()
        setAttributes(newAttributes)
    }

    const handleSave = () => {
        startTransition(async () => {
            try {
                const settings = {
                    ...initialSettings,
                    inventory: {
                        ...initialSettings?.inventory,
                        custom_attributes: attributes.filter(a => a.name.trim() !== ''),
                        variant_labels: {
                            color: variantLabels.color.toUpperCase(),
                            size: variantLabels.size.toUpperCase()
                        }
                    }
                }
                await updateInventorySettingsAction(organizationId, slug, settings)
                toast.success("Configuración actualizada")
                setOpen(false)
                // Optional: window.location.reload() if deep re-render needed, but server action revalidates path
            } catch (error) {
                toast.error("Error al guardar la configuración")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="bg-white border-slate-200 text-slate-600 font-bold uppercase text-[10px] h-10 px-4 rounded-xl shadow-sm hover:bg-slate-50">
                    <Settings2 size={16} className="text-slate-500" />
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-md bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Configuración de Inventario</DialogTitle>
                    <DialogDescription className="text-xs font-medium text-slate-500">
                        Define los atributos personalizados para los productos de tu organización.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 p-6">
                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-[10px] font-black uppercase text-slate-400">Etiquetas de Variantes</h4>
                            <span className="bg-blue-100 text-blue-600 text-[8px] font-bold px-2 py-0.5 rounded-full">Ejes Principales</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[9px] font-bold uppercase text-slate-500">Eje de Color/Material</Label>
                                <Input
                                    value={variantLabels.color}
                                    onChange={(e) => setVariantLabels({ ...variantLabels, color: e.target.value })}
                                    className="h-10 text-xs font-bold uppercase rounded-xl border-slate-200 bg-white"
                                    placeholder="Ej: COLOR"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[9px] font-bold uppercase text-slate-500">Eje de Talle/Medida</Label>
                                <Input
                                    value={variantLabels.size}
                                    onChange={(e) => setVariantLabels({ ...variantLabels, size: e.target.value })}
                                    className="h-10 text-xs font-bold uppercase rounded-xl border-slate-200 bg-white"
                                    placeholder="Ej: TALLE"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold uppercase text-slate-500">Atributos Globales Adicionales</Label>
                            <Button variant="ghost" size="sm" onClick={handleAddAttribute} type="button" className="h-8 text-[10px] font-black uppercase text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg">
                                <Plus size={14} className="mr-1" /> Agregar
                            </Button>
                        </div>

                        {attributes.length === 0 ? (
                            <div className="text-xs font-medium text-slate-400 text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                Sin atributos extra definidos.<br />
                                <span className="text-[10px] opacity-70">Ej: Tela, Temporada, Marca.</span>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                {attributes.map((attr, index) => (
                                    <div key={index} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                        <Input
                                            value={attr.name}
                                            onChange={(e) => handleNameChange(index, e.target.value)}
                                            placeholder="NOMBRE ATRIBUTO..."
                                            className="h-10 text-xs font-bold uppercase rounded-xl border-slate-200"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl shrink-0 transition-colors"
                                            onClick={() => handleRemoveAttribute(index)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-6 bg-slate-50 border-t border-slate-100">
                    <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold uppercase text-[10px] text-slate-500 hover:text-slate-900">Cancelar</Button>
                    <Button onClick={handleSave} disabled={isPending} className="bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase text-[10px] shadow-lg px-6 h-10">
                        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} className="mr-2" />}
                        Guardar Cambios
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
