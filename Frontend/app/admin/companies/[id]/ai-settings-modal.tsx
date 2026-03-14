'use client'

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings2, Save, Loader2, Bot } from "lucide-react"
import { updateSettingsAction } from "./actions"

interface Props {
    organizationId: string;
    initialSettings: any;
    trigger?: React.ReactNode;
}

export function AISettingsModal({ organizationId, initialSettings, trigger }: Props) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [aiSettings, setAiSettings] = useState({
        max_messages_per_hour: initialSettings?.ai?.max_messages_per_hour || 50,
        daily_limit: initialSettings?.ai?.daily_limit || 200
    })

    const handleSave = () => {
        startTransition(async () => {
            try {
                const settings = {
                    ...initialSettings,
                    ai: aiSettings
                }
                await updateSettingsAction(organizationId, settings)
                setOpen(false)
            } catch (error) {
                alert("Error al guardar la configuración de IA")
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? (
                    trigger
                ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                        <Settings2 size={16} />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-indigo-600" />
                        <DialogTitle>Configuración del Asistente IA</DialogTitle>
                    </div>
                    <DialogDescription>
                        Ajusta los límites de uso de la IA para esta organización.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Mensajes por Hora</Label>
                            <Input
                                type="number"
                                value={aiSettings.max_messages_per_hour}
                                onChange={(e) => setAiSettings({ ...aiSettings, max_messages_per_hour: parseInt(e.target.value) })}
                                className="h-10 font-bold"
                                placeholder="Ej: 50"
                            />
                            <p className="text-[10px] text-slate-400">Máximo de consultas que la empresa puede hacer por hora.</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-slate-500">Límite Diario Total</Label>
                            <Input
                                type="number"
                                value={aiSettings.daily_limit}
                                onChange={(e) => setAiSettings({ ...aiSettings, daily_limit: parseInt(e.target.value) })}
                                className="h-10 font-bold"
                                placeholder="Ej: 200"
                            />
                            <p className="text-[10px] text-slate-400">Tope máximo de mensajes acumulados por día.</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="mr-2" />}
                        Guardar Configuración
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
