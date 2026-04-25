'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { backupService, BackupFile } from '@/services/backupService'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RestoreHistory } from './restore-history'
import { Loader2, Download, Archive, RefreshCw, ShieldCheck, Database, UploadCloud, History } from 'lucide-react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

export function BackupManager() {
    const params = useParams()
    const slug = params?.slug as string

    const [backups, setBackups] = useState<BackupFile[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [restoring, setRestoring] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Alert Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [pendingFile, setPendingFile] = useState<File | null>(null)
    const [lastRestore, setLastRestore] = useState<number>(0)
    const [analysis, setAnalysis] = useState<any>(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [selectedCollections, setSelectedCollections] = useState<string[]>([])

    const fetchBackups = async () => {
        try {
            const data = await backupService.getAll(slug)
            setBackups(data)
        } catch (error) {
            toast.error('Error al cargar respaldos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBackups()
    }, [])

    const handleCreateBackup = async () => {
        setCreating(true)
        console.log("Creating backup for Org:", slug);
        try {
            const res = await backupService.create('Manual', slug)
            if (res.success) {
                toast.success('Respaldo creado exitosamente', {
                    icon: <CheckCircle2 className="text-green-500" />
                })
                fetchBackups()
            } else {
                toast.error('Error al crear respaldo')
            }
        } catch (error) {
            toast.error('Error de conexión')
        } finally {
            setCreating(false)
        }
    }

    const handleDownload = async (filename: string) => {
        try {
            await backupService.downloadFile(filename)
            toast.success('Descarga iniciada')
        } catch (error) {
            toast.error('Error al descargar archivo')
        }
    }

    const handleRestoreClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        
        setPendingFile(file)
        setAnalyzing(true)
        setConfirmOpen(true)
        
        try {
            const data = await backupService.analyze(file)
            if (data.success) {
                setAnalysis(data)
                // Select all by default
                setSelectedCollections(Object.keys(data.counts))
            } else {
                toast.error('No se pudo analizar el archivo')
            }
        } catch (error) {
            toast.error('Error al procesar el archivo')
        } finally {
            setAnalyzing(false)
        }
        
        event.target.value = '' // Reset input
    }

    const executeRestore = async () => {
        if (!pendingFile) return
        setConfirmOpen(false)
        setRestoring(true)
        try {
            const res = await backupService.restore(pendingFile, selectedCollections)
            if (res.success) {
                toast.success('¡Restauración Exitosa!')
                toast.info(`Se procesaron ${res.results.totalChanges} cambios`)
                fetchBackups() // Refresh lists if needed
                setLastRestore(Date.now()) // Refresh History Tab
            } else {
                toast.error('Error al restaurar respaldo')
            }
        } catch (error: any) {
            toast.error(error.message || 'Error crítico en restauración')
        } finally {
            setRestoring(false)
            setPendingFile(null)
            setAnalysis(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <ShieldCheck className="text-emerald-500" />
                        Sistema de Seguridad
                    </h2>
                    <p className="text-slate-500 text-sm">
                        Centro de control para respaldo y recuperación de datos críticos.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="backups" className="w-full">
                <TabsList className="mb-4 bg-slate-100 p-1">
                    <TabsTrigger value="backups" className="flex gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Database size={14} /> Copias de Seguridad
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <History size={14} /> Historial de Restauración
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="backups">
                    <div className="mb-4 flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={fetchBackups} disabled={loading || creating || restoring}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refrescar
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={handleRestoreClick}
                            disabled={restoring || creating}
                            className="bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-200"
                        >
                            {restoring ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <UploadCloud className="w-4 h-4 mr-2" />
                            )}
                            Importar Respaldo
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json.gz"
                            className="hidden"
                        />

                        <Button
                            onClick={handleCreateBackup}
                            disabled={creating || loading || restoring}
                            className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl transition-all shadow-lg shadow-slate-200"
                        >
                            {creating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Database className="w-4 h-4 mr-2" />
                            )}
                            Crear Respaldo Ahora
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium uppercase tracking-wide text-slate-500">
                                Archivos de Respaldo
                            </CardTitle>
                            <CardDescription>
                                Los archivos disponibles para descarga o restauración inmediata.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="animate-spin text-slate-300" />
                                </div>
                            ) : backups.length === 0 ? (
                                <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed text-slate-400">
                                    <Archive className="mx-auto w-12 h-12 mb-3 opacity-50" />
                                    <p>No hay respaldos disponibles todavía.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha y Hora</TableHead>
                                            <TableHead>Nombre del Archivo</TableHead>
                                            <TableHead>Operador</TableHead>
                                            <TableHead>Tamaño</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {backups.map((backup) => (
                                            <TableRow key={backup.filename}>
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-900 font-bold">{new Date(backup.date).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                        {backup.label && <span className="text-[10px] text-emerald-600 font-medium">#{backup.label}</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-slate-900 font-semibold text-xs">{backup.filename}</span>
                                                        {backup.itemCounts && (
                                                            <div className="flex gap-1.5 flex-wrap">
                                                                {Object.entries(backup.itemCounts).map(([k, v]: any) => {
                                                                    const labels: Record<string, string> = {
                                                                        products: 'productos',
                                                                        customers: 'clientes',
                                                                        suppliers: 'proveedores',
                                                                        sales: 'ventas',
                                                                        purchases: 'compras',
                                                                        cashMovements: 'mov. caja',
                                                                        users: 'usuarios',
                                                                        checks: 'cheques',
                                                                        appointments: 'turnos'
                                                                    }
                                                                    return (
                                                                        <span key={k} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                                                                            {labels[k] || k}: <span className="text-slate-900">{v}</span>
                                                                        </span>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-slate-700 font-bold leading-tight">
                                                            {backup.createdBy || 'Sistema'}
                                                        </span>
                                                        {backup.createdByRole && (
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                {backup.createdByRole}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="font-mono text-[10px] bg-slate-50 border-slate-200">
                                                        {backup.size}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDownload(backup.filename)}
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Descargar
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history">
                    <RestoreHistory key={lastRestore} />
                </TabsContent>
            </Tabs>

            <AlertDialog open={confirmOpen} onOpenChange={(val) => {
                if (!val && !restoring) {
                    setConfirmOpen(false)
                    setAnalysis(null)
                }
            }}>
                <AlertDialogContent className="max-w-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                            Atención: Restauración de Sistema
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-4 pt-2 text-slate-600 text-sm">
                                <div className="p-3 bg-amber-50 rounded-md border border-amber-100 text-amber-900 text-sm">
                                    <strong>Archivo seleccionado:</strong><br />
                                    <span className="font-mono text-xs">{pendingFile?.name}</span>
                                </div>

                                {analyzing ? (
                                    <div className="flex items-center justify-center p-6 gap-3">
                                        <Loader2 className="animate-spin text-amber-500" />
                                        <span>Analizando contenido del respaldo...</span>
                                    </div>
                                ) : analysis ? (
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-2">Contenido detectado:</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {Object.entries(analysis.counts).map(([key, count]: any) => (
                                                    <div key={key} className="flex items-center space-x-2 border p-2 rounded-md bg-white">
                                                        <Checkbox 
                                                            id={`check-${key}`}
                                                            checked={selectedCollections.includes(key)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedCollections(prev => [...prev, key])
                                                                } else {
                                                                    setSelectedCollections(prev => prev.filter(c => c !== key))
                                                                }
                                                            }}
                                                        />
                                                        <Label htmlFor={`check-${key}`} className="text-xs cursor-pointer flex-1">
                                                            <span className="capitalize">
                                                                {(({
                                                                    products: 'Productos',
                                                                    customers: 'Clientes',
                                                                    suppliers: 'Proveedores',
                                                                    sales: 'Ventas',
                                                                    purchases: 'Compras',
                                                                    cashMovements: 'Mov. caja',
                                                                    users: 'Usuarios',
                                                                    organizations: 'Organización',
                                                                    roles: 'Roles',
                                                                    cashRegisters: 'Cajas registradoras',
                                                                    cashSessions: 'Sesiones de caja',
                                                                    saleItems: 'Detalles de venta',
                                                                    purchaseItems: 'Detalles de compra',
                                                                    supplierAccounts: 'Ctas. proveedores',
                                                                    supplierAccountMovements: 'Mov. proveedores',
                                                                    customerAccounts: 'Ctas. clientes',
                                                                    checks: 'Cheques',
                                                                    appointments: 'Turnos (Agenda)'
                                                                } as Record<string, string>)[key] || key)}
                                                            </span>
                                                            <span className="ml-1 text-slate-400">({count})</span>
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="p-3 bg-slate-50 rounded-md text-[11px] space-y-1">
                                            <p className="font-bold text-slate-700">Reglas de Importación:</p>
                                            <ul className="list-disc pl-4">
                                                <li>Se recuperarán registros eliminados.</li>
                                                <li>Se actualizarán los datos de registros existentes (mismo ID).</li>
                                                <li><strong>Los datos creados después de este respaldo NO se borrarán.</strong></li>
                                            </ul>
                                        </div>
                                    </div>
                                ) : null}

                                <p className="font-medium text-center border-t pt-4">¿Estás seguro de continuar con la restauración?</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAnalysis(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={executeRestore} 
                            disabled={analyzing || selectedCollections.length === 0}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            Confirmar Restauración
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
