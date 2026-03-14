'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { afipService } from '@/services/afipFrontendService'
import { Toaster, toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, FileKey, Server, UploadCloud, BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AfipSettings({ org }: { org: any }) {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<any>(null)
    const [checkingStatus, setCheckingStatus] = useState(false)

    // Form State
    const [enabled, setEnabled] = useState(org.afip_settings?.enabled || false)
    const [mode, setMode] = useState(org.afip_settings?.mode || 'testing')
    const [salesPoint, setSalesPoint] = useState(org.afip_settings?.sales_point || 1)
    const [cuit, setCuit] = useState(org.afip_settings?.cuit || '')

    // Fiscal Profile State
    const [taxCondition, setTaxCondition] = useState(org.afip_settings?.tax_condition || 'Responsable Inscripto')
    const [grossIncome, setGrossIncome] = useState(org.afip_settings?.gross_income || '')
    const [startDate, setStartDate] = useState(org.afip_settings?.start_activity_date || '')

    // File State
    const [certFile, setCertFile] = useState<File | null>(null)
    const [keyFile, setKeyFile] = useState<File | null>(null)

    useEffect(() => {
        if (enabled) {
            checkStatus()
        }
    }, [enabled])

    const checkStatus = async () => {
        setCheckingStatus(true)
        const res = await afipService.getServerStatus(org.id)
        if (res.success) {
            setStatus({ ok: true, message: 'Conectado a ARCA' })
        } else {
            setStatus({ ok: false, message: 'Error de conexión' })
        }
        setCheckingStatus(false)
    }

    const handleSaveSettings = async () => {
        setLoading(true)
        const res = await afipService.updateSettings(org.id, {
            enabled,
            mode,
            sales_point: salesPoint,
            cuit,
            // New Fields
            tax_condition: taxCondition,
            gross_income: grossIncome,
            start_activity_date: startDate
        })

        if (res.success) {
            toast.success("Configuración guardada")
            if (enabled) checkStatus()
        } else {
            toast.error("Error al guardar")
        }
        setLoading(false)
    }

    const handleUploadCerts = async () => {
        if (!certFile && !keyFile) return toast.error("Seleccioná al menos un archivo")

        setLoading(true)
        const formData = new FormData()
        if (certFile) formData.append('cert', certFile)
        if (keyFile) formData.append('key', keyFile)

        const res = await afipService.uploadCertificates(org.id, formData)

        if (res.success) {
            toast.success("Certificados subidos correctamente")
            setCertFile(null)
            setKeyFile(null)
        } else {
            toast.error("Error al subir certificados")
        }
        setLoading(false)
    }

    const hasCerts = org.afip_settings?.cert_path && org.afip_settings?.key_path;

    return (
        <div className="space-y-6">
            {/* ESTADO DEL SERVICIO */}
            <div className="flex justify-between items-center px-2">
                <div>
                    <h2 className="text-xl font-black tracking-tight uppercase text-slate-800">Facturación Electrónica (ARCA / AFIP)</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Vinculá tu sistema con ARCA (Agencia de Recaudación)</p>
                </div>
                {enabled && (
                    <div className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        status?.ok ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                    )}>
                        {checkingStatus ? <Loader2 className="animate-spin w-3 h-3" /> : (status?.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />)}
                        {checkingStatus ? "Verificando..." : (status?.ok ? "ONLINE" : "OFFLINE")}
                    </div>
                )}
            </div>

            {/* ACTIVACIÓN */}
            <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Habilitar Facturación</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Activa la emisión fiscal de comprobantes</CardDescription>
                    </div>
                    <Switch checked={enabled} onCheckedChange={setEnabled} />
                </CardHeader>
                {enabled && (
                    <CardContent className="pt-6 grid gap-6">

                        {/* PERFIL FISCAL (NUEVO) */}
                        <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-4">
                            <h3 className="text-sm font-black uppercase text-blue-800 flex items-center gap-2">
                                <BadgeCheck size={16} /> Perfil Fiscal del Emisor
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-500">Condición Frente al IVA</Label>
                                    <Select value={taxCondition} onValueChange={setTaxCondition}>
                                        <SelectTrigger className="h-12 bg-white border-blue-200 text-blue-900 font-bold rounded-xl">
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Responsable Inscripto">Responsable Inscripto</SelectItem>
                                            <SelectItem value="Monotributo">Monotributo</SelectItem>
                                            <SelectItem value="Exento">Exento</SelectItem>
                                            <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-500">Ingresos Brutos (IIBB)</Label>
                                    <Input
                                        value={grossIncome}
                                        onChange={e => setGrossIncome(e.target.value)}
                                        className="h-12 bg-white border-blue-200 text-blue-900 font-bold rounded-xl"
                                        placeholder="Nro de IIBB o CM"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-500">Inicio de Actividades</Label>
                                    <Input
                                        type="date"
                                        value={startDate ? new Date(startDate).toISOString().split('T')[0] : ''}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="h-12 bg-white border-blue-200 text-blue-900 font-bold rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CONFIGURACIÓN BÁSICA */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500">Modo de Operación</Label>
                                <Select value={mode} onValueChange={(val: any) => setMode(val)}>
                                    <SelectTrigger className="h-12 bg-white border-slate-200 rounded-xl font-bold text-slate-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="testing">HOMOLOGACIÓN (TESTING)</SelectItem>
                                        <SelectItem value="production">PRODUCCIÓN (REAL)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[9px] text-slate-400 font-medium ml-1">Usá Homologación para probar sin validez fiscal.</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500">CUIT del Emisor</Label>
                                <Input
                                    value={cuit}
                                    onChange={(e) => setCuit(e.target.value)}
                                    placeholder="20123456789"
                                    className="h-12 bg-white border-slate-200 rounded-xl font-bold text-slate-700 tracking-wider"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500">Punto de Venta (ARCA)</Label>
                                <Input
                                    type="number"
                                    value={salesPoint}
                                    onChange={(e) => setSalesPoint(parseInt(e.target.value))}
                                    className="h-12 bg-white border-slate-200 rounded-xl font-bold text-slate-700"
                                />
                                <p className="text-[9px] text-slate-400 font-medium ml-1">El número de PTO VTA registrado en Webservice.</p>
                            </div>
                        </div>

                        {/* CERTIFICADOS */}
                        <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <FileKey size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase text-slate-700">Certificados Digitales</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1">
                                        {hasCerts ? <span className="text-emerald-500 flex items-center gap-1"><BadgeCheck size={12} /> Configurados</span> : "Faltan Archivos"}
                                    </p>
                                </div>
                            </div>

                            {/* CSR GENERATOR */}
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 mb-4">
                                <div className="flex justify-between items-center">
                                    <div className="mb-2">
                                        <h4 className="text-[10px] font-black uppercase text-amber-700 mb-1">¿No tenés certificado?</h4>
                                        <p className="text-[9px] text-amber-600 font-medium leading-tight max-w-[250px]">
                                            Generá una solicitud (CSR) aquí, subila a AFIP, descargá el .CRT y subilo abajo.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={async () => {
                                            setLoading(true);
                                            const res = await afipService.generateCsr(org.id);
                                            setLoading(false);

                                            if (res.success && res.csr && res.key) {
                                                // Download CSR
                                                const blobCsr = new Blob([res.csr], { type: 'text/plain' });
                                                const urlCsr = window.URL.createObjectURL(blobCsr);
                                                const aCsr = document.createElement('a');
                                                aCsr.href = urlCsr;
                                                aCsr.download = "pedido_afip.csr";
                                                document.body.appendChild(aCsr);
                                                aCsr.click();
                                                window.URL.revokeObjectURL(urlCsr);

                                                // Download Key
                                                const blobKey = new Blob([res.key], { type: 'text/plain' });
                                                const urlKey = window.URL.createObjectURL(blobKey);
                                                const aKey = document.createElement('a');
                                                aKey.href = urlKey;
                                                aKey.download = "clave_privada.key";
                                                document.body.appendChild(aKey);
                                                aKey.click();
                                                window.URL.revokeObjectURL(urlKey);

                                                toast.success("¡Archivos Generados! Se descargaron .csr y .key");
                                                toast.info("Guardá la .key, la necesitarás para subir el certificado.");
                                            } else {
                                                toast.error("Error generando CSR");
                                            }
                                        }}
                                        variant="outline"
                                        className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100 font-bold text-[9px] h-8 rounded-lg uppercase tracking-wider"
                                    >
                                        Generar CSR + Key
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Certificado (.crt)</Label>
                                    <Input type="file" onChange={(e) => setCertFile(e.target.files?.[0] || null)} className="text-xs file:bg-slate-100 file:text-slate-700 file:rounded-lg file:border-0 file:px-2 file:py-1 file:mr-2 file:font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400">Clave Privada (.key)</Label>
                                    <Input type="file" onChange={(e) => setKeyFile(e.target.files?.[0] || null)} className="text-xs file:bg-slate-100 file:text-slate-700 file:rounded-lg file:border-0 file:px-2 file:py-1 file:mr-2 file:font-bold" />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button onClick={handleUploadCerts} disabled={!certFile || !keyFile || loading} variant="outline" className="border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-black uppercase text-[10px] tracking-widest h-10 rounded-xl">
                                    <UploadCloud size={14} className="mr-2" /> Subir Certificados
                                </Button>
                            </div>
                        </div>

                        {/* GUARDAR */}
                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSaveSettings} disabled={loading} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-8 h-12 tracking-widest rounded-xl shadow-xl shadow-slate-200">
                                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Guardar Configuración"}
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div>
    )
}
