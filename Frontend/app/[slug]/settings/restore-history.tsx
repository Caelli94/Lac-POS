'use client'

import { useState, useEffect } from 'react'
import { backupService } from '@/services/backupService'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, Loader2, History } from 'lucide-react'
import { RestoreDetailsDialog } from './restore-details-dialog'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

export function RestoreHistory() {
    const [history, setHistory] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedLog, setSelectedLog] = useState<any | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'RESTORED':
                return <Badge className="bg-emerald-500 hover:bg-emerald-600">Exitoso</Badge>
            case 'PROCESSED':
                return <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">Sin Cambios</Badge>
            case 'SUCCESS':
                return <Badge className="bg-emerald-500 hover:bg-emerald-600">Exitoso</Badge>
            case 'PARTIAL':
                return <Badge variant="secondary" className="bg-amber-100 text-amber-700">Parcial</Badge>
            case 'FAILED':
                return <Badge variant="destructive">Fallido</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const fetchHistory = async () => {
        try {
            const data = await backupService.getHistory()
            setHistory(data)
        } catch (error) {
            toast.error('Error al cargar historial')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHistory()
    }, [])

    const handleViewDetails = async (id: string) => {
        setDetailLoading(true)
        try {
            const log = await backupService.getHistoryDetails(id)
            setSelectedLog(log)
        } catch (error) {
            toast.error('Error al cargar detalles')
        } finally {
            setDetailLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <History className="text-blue-500" />
                    Registro de Actividad
                </h3>
                <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading}>
                    Actualizar
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin text-slate-300" />
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg text-slate-400">
                    Sin registros de restauración recientes.
                </div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Respaldo Utilizado</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Detalle</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((item) => (
                                <TableRow key={item._id}>
                                    <TableCell className="font-medium">
                                        {new Date(item.timestamp).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-slate-500 font-mono text-xs">
                                        {item.backup_filename}
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(item.status)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewDetails(item._id)}
                                            disabled={detailLoading}
                                        >
                                            {detailLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Eye className="w-4 h-4 text-slate-600" />}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <RestoreDetailsDialog
                open={!!selectedLog}
                onOpenChange={(open) => !open && setSelectedLog(null)}
                log={selectedLog}
            />
        </div>
    )
}
