'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Package, Users, Factory, AlertCircle } from 'lucide-react'

interface RestoreDetailsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    log: any | null
}

export function RestoreDetailsDialog({ open, onOpenChange, log }: RestoreDetailsDialogProps) {
    if (!log) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="text-emerald-500" />
                        Detalle de Restauración
                    </DialogTitle>
                    <DialogDescription>
                        Respaldo: <span className="font-mono text-slate-900">{log.backup_filename}</span> • {new Date(log.timestamp).toLocaleString()}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="products" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="grid grid-cols-3 w-full">
                        <TabsTrigger value="products" className="flex gap-2">
                            <Package size={16} />
                            Productos ({log.summary?.products || 0})
                        </TabsTrigger>
                        <TabsTrigger value="customers" className="flex gap-2">
                            <Users size={16} />
                            Clientes ({log.summary?.customers || 0})
                        </TabsTrigger>
                        <TabsTrigger value="suppliers" className="flex gap-2">
                            <Factory size={16} />
                            Proveedores ({log.summary?.suppliers || 0})
                        </TabsTrigger>
                    </TabsList>

                    {/* Common Table Renderer */}
                    {['products', 'customers', 'suppliers'].map((type) => (
                        <TabsContent key={type} value={type} className="flex-1 overflow-auto mt-4 border rounded-md">
                            <ScrollArea className="h-[400px] w-full p-4">
                                {log.details?.[type]?.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        No se encontraron registros de este tipo en la restauración.
                                    </div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2">Nombre / Razón Social</th>
                                                <th className="px-4 py-2">Identificador (Código/DNI)</th>
                                                <th className="px-4 py-2 text-right">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {log.details?.[type]?.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2 font-medium">{item.name}</td>
                                                    <td className="px-4 py-2 text-slate-500 font-mono text-xs">{item.identifier}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        {item.item_status === 'RESTORED' && (
                                                            <Badge className="bg-orange-500 hover:bg-orange-600">Restaurado</Badge>
                                                        )}
                                                        {item.item_status === 'NEW' && (
                                                            <Badge className="bg-blue-500 hover:bg-blue-600">Nuevo</Badge>
                                                        )}
                                                        {(!item.item_status || item.item_status === 'PROCESSED') && (
                                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600">Procesado</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </ScrollArea>
                        </TabsContent>
                    ))}
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
