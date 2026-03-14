'use client'

import { useState, useEffect } from 'react'
import {
    getPriceListsAction,
    upsertPriceListAction,
    deletePriceListAction,
    togglePriceListStatusAction
} from './actions'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Tag, Lock, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogHeader } from '@/components/ui/dialog'

/**
 * PriceListSettings:
 * Componente para gestionar las diferentes listas de precios de la organización.
 */
export function PriceListSettings({ orgId }: { orgId: string }) {
    const [lists, setLists] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)

    // Dialog State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [listToEdit, setListToEdit] = useState<any>(null)
    const [newName, setNewName] = useState('')

    const loadLists = async () => {
        setFetching(true)
        try {
            const res = await getPriceListsAction(orgId)
            if (res.success) {
                setLists(res.data)
            } else {
                toast.error("Error al obtener las listas");
            }
        } catch (err) {
            toast.error("Error de comunicación");
        } finally {
            setFetching(false)
        }
    }

    useEffect(() => { loadLists() }, [orgId])

    const handleOpenCreate = () => {
        setListToEdit(null)
        setNewName('')
        setIsDialogOpen(true)
    }

    const handleOpenEdit = (list: any) => {
        setListToEdit(list)
        setNewName(list.name)
        setIsDialogOpen(true)
    }

    const handleSave = async () => {
        if (!newName.trim()) return;
        setLoading(true)

        // Pass ID if editing
        const id = listToEdit ? listToEdit.id : undefined;
        const res = await upsertPriceListAction(orgId, newName, id)

        if (res.success) {
            toast.success(listToEdit ? "Lista actualizada" : "Lista creada");
            setNewName('');
            setListToEdit(null);
            setIsDialogOpen(false);
            await loadLists();
        } else {
            toast.error(res.error || "Error al guardar");
        }
        setLoading(false)
    }

    const handleToggle = async (id: string, name: string, currentState: boolean) => {
        if (name === 'PRINCIPAL') return;
        const res = await togglePriceListStatusAction(orgId, id, !currentState);
        if (res.success) {
            toast.success("Estado actualizado");
            loadLists();
        } else {
            toast.error("Error");
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (name === 'PRINCIPAL') return;
        if (confirm(`¿Eliminar ${name}?`)) {
            const res = await deletePriceListAction(orgId, id);
            if (res.success) {
                toast.success("Eliminado");
                loadLists();
            } else {
                toast.error("Error al eliminar");
            }
        }
    }

    return (
        <div className="space-y-6">
            {/* CABECERA TIPO TOOLBAR */}
            <div className="flex justify-between items-center px-2">
                <div>
                    <h2 className="text-xl font-black tracking-tight uppercase text-slate-800">Listas de Precios</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Habilitá listas para Inventario y Ventas</p>
                </div>
                <Button
                    onClick={handleOpenCreate}
                    className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl"
                >
                    <Plus size={16} className="mr-2" /> Nueva Lista
                </Button>
            </div>

            {/* TABLA DE PRECIOS */}
            <div className="border border-slate-100 rounded-[2.5rem] bg-white shadow-2xl shadow-slate-200/50 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50 h-14">
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                            <TableHead className="font-black text-[10px] uppercase text-slate-400 px-8">Nombre de Lista</TableHead>
                            <TableHead className="font-black text-[10px] uppercase text-slate-400 text-center">Estado</TableHead>
                            <TableHead className="font-black text-[10px] uppercase text-slate-400 text-right px-8">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fetching ? (
                            <TableRow><TableCell colSpan={3} className="h-24 text-center"><Loader2 className="animate-spin text-slate-300 mx-auto" /></TableCell></TableRow>
                        ) : lists.map(list => (
                            <TableRow key={list.id} className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all">
                                <TableCell className="py-5 px-8">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                            list.is_active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-300'
                                        )}>
                                            {list.name === 'PRINCIPAL' ? <Lock size={14} /> : <Tag size={14} />}
                                        </div>
                                        <span className="font-black text-xs uppercase text-slate-800 tracking-tight">{list.name}</span>
                                        {list.name === 'PRINCIPAL' && <span className="text-[9px] bg-slate-100 text-slate-400 px-2 rounded-full font-bold">DEFAULT</span>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <Switch
                                            checked={list.name === 'PRINCIPAL' ? true : list.is_active}
                                            disabled={list.name === 'PRINCIPAL'}
                                            onCheckedChange={() => handleToggle(list.id, list.name, list.is_active)}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="text-right px-8">
                                    <div className="flex justify-end gap-2 items-center opacity-0 group-hover:opacity-100 transition-all">
                                        {list.name !== 'PRINCIPAL' && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenEdit(list)}
                                                    className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                                >
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(list.id, list.name)}
                                                    className="h-9 w-9 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!fetching && lists.length === 0 && (
                            <TableRow><TableCell colSpan={3} className="h-24 text-center text-xs font-bold text-slate-300 uppercase">Sin listas registradas</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* DIALOG GESTION LISTA */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[450px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">
                            {listToEdit ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-8 flex flex-col gap-6 bg-white text-slate-900">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre de la Lista</Label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value.toUpperCase())}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                                placeholder="EJ: MAYORISTA, GREMIO, ETC."
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsDialogOpen(false)}
                            className="rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={loading}
                            className="rounded-xl bg-slate-900 hover:bg-black text-white px-8 h-11 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200"
                        >
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (listToEdit ? "Guardar Cambios" : "Crear Lista")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}