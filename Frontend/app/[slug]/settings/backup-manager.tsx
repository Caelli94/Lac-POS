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
            const res = await backupService.create('manual-user', slug)
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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        setPendingFile(file)
        setConfirmOpen(true)
        event.target.value = '' // Reset input
    }

    const executeRestore = async () => {
        if (!pendingFile) return
        setConfirmOpen(false)
        setRestoring(true)
        try {
            const res = await backupService.restore(pendingFile)
            if (res.success) {
                toast.success('¡Restauración Exitosa!')
                toast.info(`Se procesaron ${JSON.stringify(res.results)} registros`)
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
                                            <TableHead>Tamaño</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {backups.map((backup) => (
                                            <TableRow key={backup.filename}>
                                                <TableCell className="font-medium">
                                                    {new Date(backup.date).toLocaleString('es-AR')}
                                                </TableCell>
                                                <TableCell className="text-slate-500 font-mono text-xs">
                                                    {backup.filename}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                        {backup.size}
                                                    </span>
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

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                            Atención: Restauración de Sistema
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 pt-2 text-slate-600 text-sm">
                                <div className="p-3 bg-amber-50 rounded-md border border-amber-100 text-amber-900 text-sm">
                                    <strong>Estás a punto de importar:</strong><br />
                                    <span className="font-mono">{pendingFile?.name}</span>
                                </div>
                                <p>
                                    Esta acción <strong>fusionará</strong> los datos del respaldo con los actuales.
                                </p>
                                <ul className="list-disc pl-5 text-xs space-y-1">
                                    <li>Se recuperarán clientes y productos eliminados.</li>
                                    <li>Se actualizarán los precios y datos existentes.</li>
                                    <li>Los datos nuevos NO serán borrados.</li>
                                </ul>
                                <p className="font-medium">¿Estás seguro de continuar?</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={executeRestore} className="bg-amber-600 hover:bg-amber-700">
                            Confirmar Restauración
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
