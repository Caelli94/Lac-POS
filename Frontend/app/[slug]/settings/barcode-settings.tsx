'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Barcode from 'react-barcode';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { updateOrganization } from './actions';

interface BarcodeSettingsProps {
    settings: any;
    orgId: string;
}

export function BarcodeSettings({ settings, orgId }: BarcodeSettingsProps) {
    const [config, setConfig] = useState({
        enabled: settings?.enabled || false,
        defaultFormat: settings?.defaultFormat || 'CODE128',
        showText: settings?.showText !== undefined ? settings.showText : true,
        height: settings?.height || 50,
        width: settings?.width || 2,
        labelWidth: settings?.labelWidth || 50,
        labelHeight: settings?.labelHeight || 25
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (key: string, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Need to update organization via Server Action
            // We'll wrap the config in "barcodeSettings" key
            const res = await updateOrganization(orgId, { barcodeSettings: config });
            if (res.success) {
                toast.success("Configuración de códigos de barra guardada");
            } else {
                toast.error("Error al guardar configuración");
            }
        } catch (e) {
            toast.error("Error de conexión");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Configuración Global</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Define el comportamiento de los códigos de barra en el sistema.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold">Habilitar Sistema de Barras</Label>
                                <p className="text-xs text-slate-500">Permite generar e imprimir etiquetas en productos.</p>
                            </div>
                            <Switch checked={config.enabled} onCheckedChange={(c) => handleChange('enabled', c)} />
                        </div>

                        {config.enabled && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">

                                <div className="space-y-2">
                                    <Label>Formato por Defecto</Label>
                                    <Select value={config.defaultFormat} onValueChange={(v) => handleChange('defaultFormat', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CODE128">CODE128 (Recomendado)</SelectItem>
                                            <SelectItem value="EAN13">EAN-13 (13 dígitos)</SelectItem>
                                            <SelectItem value="UPC">UPC (12 dígitos)</SelectItem>
                                            <SelectItem value="CODE39">CODE39</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-slate-500">CODE128 soporta letras y números. EAN-13 solo números.</p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>Mostrar Texto Legible</Label>
                                    <Switch checked={config.showText} onCheckedChange={(c) => handleChange('showText', c)} />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <Label>Altura de Barras ({config.height}px)</Label>
                                    </div>
                                    <Slider value={[config.height]} min={20} max={150} step={5} onValueChange={(v) => handleChange('height', v[0])} />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <Label>Ancho de Líneas ({config.width}px)</Label>
                                    </div>
                                    <Slider value={[config.width]} min={1} max={5} step={1} onValueChange={(v) => handleChange('width', v[0])} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>



                {config.enabled && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Configuración de Impresión</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dimensiones de la etiqueta física.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Ancho (mm)</Label>
                                <div className="relative">
                                    <Input type="number" value={config.labelWidth} onChange={(e) => handleChange('labelWidth', Number(e.target.value))} />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">mm</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Alto (mm)</Label>
                                <div className="relative">
                                    <Input type="number" value={config.labelHeight} onChange={(e) => handleChange('labelHeight', Number(e.target.value))} />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">mm</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-black">
                    {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                    Guardar Configuración
                </Button>
            </div>

            {/* PREVIEW PANEL */}
            {
                config.enabled && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <Card className="bg-slate-50 border-2 border-dashed h-full flex flex-col items-center justify-center p-10 text-center space-y-8">
                            <div>
                                <h3 className="text-sm font-black uppercase text-slate-400 mb-4">Vista Previa (En Pantalla)</h3>
                                <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
                                    <Barcode
                                        value="123456789012"
                                        format={config.defaultFormat}
                                        width={config.width}
                                        height={config.height}
                                        displayValue={config.showText}
                                        font="monospace"
                                        textAlign="center"
                                        textPosition="bottom"
                                        textMargin={2}
                                        fontSize={14}
                                        background="#ffffff"
                                        lineColor="#000000"
                                    />
                                </div>
                            </div>

                            <div className="w-full pt-8 border-t border-slate-200">
                                <h3 className="text-sm font-black uppercase text-slate-400 mb-4">Simulación de Etiqueta ({config.labelWidth}x{config.labelHeight}mm)</h3>
                                <div
                                    className="bg-white border shadow-md mx-auto flex flex-col items-center justify-center overflow-hidden"
                                    style={{
                                        width: `${config.labelWidth * 3.78}px`, // Approx conversion mm to px (96dpi)
                                        height: `${config.labelHeight * 3.78}px`,
                                        padding: '5px'
                                    }}
                                >
                                    <p className="text-[10px] font-bold truncate w-full text-center">Producto Ejemplo</p>
                                    <div className="transform scale-75 origin-center">
                                        <Barcode
                                            value="ABC-12345"
                                            format={config.defaultFormat}
                                            width={config.width > 2 ? 2 : config.width} // Constrain for small preview
                                            height={30}
                                            displayValue={config.showText}
                                            fontSize={10}
                                        />
                                    </div>
                                    <p className="text-[10px] font-black mt-1">$ 1.500,00</p>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 italic">La escala puede variar en pantalla.</p>
                            </div>
                        </Card>
                    </div>
                )
            }
        </div >
    );
}
