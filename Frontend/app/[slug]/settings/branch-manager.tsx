"use client";

import React, { useState, useEffect } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Edit2, Trash2, MapPin, Phone, Building2, Plus, User, Clock, Store, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { upsertBranchAction, deleteBranchAction } from "./actions";

/**
 * BranchManager:
 * Interfaz de usuario para administrar las sucursales. 
 * Maneja estados de modales, carga y sincronización de datos con el servidor.
 */
export function BranchManager({ branches: initialBranches = [], orgId }: { branches: any[], orgId: string }) {
    const [branches, setBranches] = useState(initialBranches);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const [branchToEdit, setBranchToEdit] = useState<any>(null);
    const [branchToDelete, setBranchToDelete] = useState<any>(null);

    const [newBranch, setNewBranch] = useState({
        name: "", location: "", address: "", phone: "", manager: "", opening_hours: ""
    });

    /**
     * Sincronización de datos:
     * Actualiza el estado local cada vez que cambian las props enviadas por el servidor.
     */
    useEffect(() => {
        setBranches(initialBranches);
    }, [JSON.stringify(initialBranches)]);

    /**
     * handleAction:
     * Procesa el guardado (creación o edición) de la sucursal y solicita un refresco al servidor.
     */
    const handleAction = async (data: any, isEdit: boolean) => {
        if (!data.name) return toast.error("El nombre es obligatorio");
        setLoading(true);

        try {
            const res = await upsertBranchAction(orgId, data);

            if (res.success) {
                toast.success(isEdit ? "Sucursal actualizada" : "Sucursal creada con éxito");
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                setNewBranch({ name: "", location: "", address: "", phone: "", manager: "", opening_hours: "" });
                router.refresh();
            } else {
                toast.error("Error del servidor: " + res.error);
            }
        } catch (error) {
            toast.error("Error inesperado en la conexión.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * handleDelete:
     * Ejecuta la eliminación física en la base de datos y actualiza la lista.
     */
    const handleDelete = async () => {
        if (!branchToDelete) return;
        setLoading(true);
        try {
            const res = await deleteBranchAction(branchToDelete.id);
            if (res.success) {
                toast.success("Sucursal eliminada.");
                setIsDeleteDialogOpen(false);
                router.refresh();
            } else {
                toast.error(res.error);
            }
        } catch (err) {
            toast.error("No se pudo eliminar el local.");
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            {/* CABECERA */}
            <div className="flex justify-between items-center px-2">
                <div>
                    <h2 className="text-xl font-black tracking-tight uppercase text-slate-800">Sucursales</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Gestión de locales y personal a cargo</p>
                </div>
                <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl"
                >
                    <Plus className="w-4 h-4 mr-2" /> Nueva Sucursal
                </Button>
            </div>

            {/* TABLA DE DATOS */}
            <div className="border border-slate-100 rounded-[2.5rem] bg-white shadow-2xl shadow-slate-200/50 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50 h-14">
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                            <TableHead className="font-black text-[10px] uppercase text-slate-400 px-8">Nombre del Local</TableHead>
                            <TableHead className="font-black text-[10px] uppercase text-slate-400">Ubicación</TableHead>
                            <TableHead className="font-black text-[10px] uppercase text-slate-400">Encargado</TableHead>
                            <TableHead className="font-black text-[10px] uppercase text-slate-400">Horarios</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase text-slate-400 px-8 tracking-widest">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {branches && branches.length > 0 ? (
                            branches.map((branch) => (
                                <TableRow key={branch.id} className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all">
                                    <TableCell className="py-5 px-8 font-black uppercase text-slate-800 text-xs">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <Store size={16} />
                                            </div>
                                            {branch.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-black text-[10px] uppercase text-slate-600">{branch.location || "---"}</span>
                                            <span className="text-[9px] text-slate-400 uppercase flex items-center gap-1 font-bold italic tracking-tighter">
                                                <MapPin size={10} className="text-blue-400" /> {branch.address || "S/D"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[10px] font-black uppercase text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <User size={12} className="inline mr-2 text-slate-300" /> {branch.manager || "SIN ASIGNAR"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-[10px] font-black uppercase text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Clock size={12} className="inline mr-2 text-slate-300" /> {branch.opening_hours || "CONSULTAR"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <Button variant="ghost" size="icon" onClick={() => { setBranchToEdit(branch); setIsEditDialogOpen(true); }} className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={14} /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => { setBranchToDelete(branch); setIsDeleteDialogOpen(true); }} className="h-9 w-9 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14} /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={5} className="h-40 text-center text-slate-300 uppercase font-black text-[10px]">No se encontraron sucursales registradas</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* MODAL NUEVA SUCURSAL */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">
                            Nueva Sucursal
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-8 grid grid-cols-2 gap-6 bg-white text-slate-900">
                        <div className="col-span-2 space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Comercial</Label>
                            <Input
                                value={newBranch.name}
                                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                                placeholder="EJ: CASA CENTRAL"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Encargado</Label>
                            <Input
                                value={newBranch.manager}
                                onChange={(e) => setNewBranch({ ...newBranch, manager: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                                placeholder="EJ: JUAN PÉREZ"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Horarios</Label>
                            <Input
                                value={newBranch.opening_hours}
                                onChange={(e) => setNewBranch({ ...newBranch, opening_hours: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                                placeholder="09:00 A 20:00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ciudad / Localidad</Label>
                            <Input
                                value={newBranch.location}
                                onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Teléfono</Label>
                            <Input
                                value={newBranch.phone}
                                onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Dirección Exacta</Label>
                            <Input
                                value={newBranch.address}
                                onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsAddDialogOpen(false)}
                            className="rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleAction(newBranch, false)}
                            disabled={loading}
                            className="rounded-xl bg-slate-900 hover:bg-black text-white px-8 h-11 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200 transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Save className="w-3 h-3 mr-2" /> Registrar Sucursal</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL EDITAR */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">
                            Modificar Información de Sucursal
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-8 grid grid-cols-2 gap-6 bg-white text-slate-900">
                        <div className="col-span-2 space-y-2 text-slate-900">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Comercial</Label>
                            <Input
                                value={branchToEdit?.name ?? ""}
                                onChange={(e) => setBranchToEdit({ ...branchToEdit, name: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Encargado</Label>
                            <Input
                                value={branchToEdit?.manager ?? ""}
                                onChange={(e) => setBranchToEdit({ ...branchToEdit, manager: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Horarios</Label>
                            <Input
                                value={branchToEdit?.opening_hours ?? ""}
                                onChange={(e) => setBranchToEdit({ ...branchToEdit, opening_hours: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ciudad</Label>
                            <Input
                                value={branchToEdit?.location ?? ""}
                                onChange={(e) => setBranchToEdit({ ...branchToEdit, location: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Teléfono</Label>
                            <Input
                                value={branchToEdit?.phone ?? ""}
                                onChange={(e) => setBranchToEdit({ ...branchToEdit, phone: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Dirección</Label>
                            <Input
                                value={branchToEdit?.address ?? ""}
                                onChange={(e) => setBranchToEdit({ ...branchToEdit, address: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditDialogOpen(false)}
                            className="rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            Cerrar
                        </Button>
                        <Button
                            type="button"
                            onClick={() => handleAction(branchToEdit, true)}
                            disabled={loading}
                            className="rounded-xl bg-slate-900 hover:bg-black text-white px-8 h-11 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Guardar Cambios"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ALERTA ELIMINAR */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-[3rem] border-none p-0 overflow-hidden shadow-2xl">
                    <div className="bg-red-50 p-10 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-[2rem] flex items-center justify-center text-red-600 mb-6 shadow-inner animate-pulse">
                            <Trash2 size={32} />
                        </div>
                        <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-red-700">¿Confirmar Baja?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[11px] font-bold text-slate-500 uppercase mt-2 tracking-widest leading-relaxed">
                            Estás intentando eliminar el local <span className="text-red-600 underline font-black">{branchToDelete?.name}</span> de forma definitiva.
                        </AlertDialogDescription>
                    </div>
                    <div className="p-6 bg-white flex justify-center gap-3 border-t border-slate-100">
                        <AlertDialogCancel className="rounded-2xl border-slate-200 font-black uppercase text-[10px] h-12 px-8 tracking-widest text-slate-400 transition-colors">No, volver</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] h-12 px-10 tracking-widest shadow-lg shadow-red-100 transition-all">Sí, eliminar sucursal</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}