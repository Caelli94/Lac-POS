'use client'

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings2, Plus, Trash2, Save, Loader2 } from "lucide-react"
import { updateSettingsAction } from "./actions"

interface CustomAttribute {
    name: string;
    type: string;
    options?: string[]; // For future use if type is select
}

interface Props {
    organizationId: string;
    initialSettings: any;
    trigger?: React.ReactNode;
}

export function InventorySettingsModal({ organizationId, initialSettings, trigger }: Props) {
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
        newAttributes[index].name = value
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
                        variant_labels: variantLabels
                    }
                }
                await updateSettingsAction(organizationId, settings)
                setOpen(false)
            } catch (error) {
                alert("Error al guardar la configuración")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? (
                    trigger
                ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                        <Settings2 size={16} />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Configuración de Inventario</DialogTitle>
                    <DialogDescription>
                        Define los atributos personalizados para los productos de esta empresa.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="text-xs font-black uppercase text-slate-500">Etiquetas de Variantes</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase">Eje de Color/Material</Label>
                                <Input
                                    value={variantLabels.color}
                                    onChange={(e) => setVariantLabels({ ...variantLabels, color: e.target.value })}
                                    className="h-8 text-xs font-bold"
                                    placeholder="Ej: Color"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] uppercase">Eje de Talle/Medida</Label>
                                <Input
                                    value={variantLabels.size}
                                    onChange={(e) => setVariantLabels({ ...variantLabels, size: e.target.value })}
                                    className="h-8 text-xs font-bold"
                                    placeholder="Ej: Talle"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-6">
                        <Label>Atributos de Producto (Globales)</Label>
                        <Button variant="outline" size="sm" onClick={handleAddAttribute} type="button">
                            <Plus size={14} className="mr-1" /> Agregar
                        </Button>
                    </div>

                    {attributes.length === 0 ? (
                        <div className="text-sm text-slate-400 italic text-center py-4 border-2 border-dashed rounded-lg">
                            Sin atributos definidos. Ej: Talle, Color, Material.
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {attributes.map((attr, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input
                                        value={attr.name}
                                        onChange={(e) => handleNameChange(index, e.target.value)}
                                        placeholder="Nombre del atributo (Ej: Talle)"
                                        className="h-9"
                                    />
                                    {/* Type selector could go here, strictly text for now */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-slate-400 hover:text-red-500 shrink-0"
                                        onClick={() => handleRemoveAttribute(index)}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="mr-2" />}
                        Guardar Cambios
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
