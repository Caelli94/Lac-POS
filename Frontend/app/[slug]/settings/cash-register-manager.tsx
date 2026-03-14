"use client";

import React, { useState, useEffect } from "react";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Edit2, Trash2, Plus, Monitor, Store, Save, Loader2, Ban, Laptop } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cashService } from "@/services/cashService";
import { setTerminalCookie } from "./actions";

export function CashRegisterManager({ registers: initialRegisters = [], branches = [], orgId, currentTerminalId }: { registers: any[], branches: any[], orgId: string, currentTerminalId?: string }) {
    const [registers, setRegisters] = useState(initialRegisters);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const [registerToEdit, setRegisterToEdit] = useState<any>(null);
    const [registerToDelete, setRegisterToDelete] = useState<any>(null);

    const [newRegister, setNewRegister] = useState({
        name: "", branch_id: "null"
    });

    useEffect(() => {
        setRegisters(initialRegisters);
    }, [JSON.stringify(initialRegisters)]);

    const handleSetTerminal = async (id: string) => {
        const res = await setTerminalCookie(id);
        if (res.success) {
            if (typeof window !== 'undefined') {
                localStorage.setItem('lac_terminal_id', id);
            }
            toast.success("Este equipo ha sido vinculado a la caja seleccionada.");
            router.refresh();
        }
    };

    const handleAction = async (data: any, isEdit: boolean) => {
        if (!data.name) return toast.error("El nombre es obligatorio");
        setLoading(true);

        const payload = {
            id: isEdit ? (data.id || data._id) : undefined,
            organization_id: orgId,
            name: data.name,
            branch_id: data.branch_id === "null" ? null : data.branch_id
        };

        console.log("Sending Payload:", payload); // Debugging

        try {
            const res = await cashService.upsertRegister(payload);

            if (res.success) {
                toast.success(isEdit ? "Caja actualizada" : "Caja creada con éxito");
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                setNewRegister({ name: "", branch_id: "null" });
                router.refresh();
            } else {
                toast.error("Error del servidor: " + res.error);
            }
        } catch (error) {
            toast.error("Error inesperado.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!registerToDelete) return;
        setLoading(true);
        try {
            const res = await cashService.deleteRegister(registerToDelete.id);
            if (res.success) {
                toast.success("Caja eliminada.");
                setIsDeleteDialogOpen(false);
                router.refresh();
            } else {
                toast.error(res.error || "No se pudo eliminar.");
            }
        } catch (err) {
            toast.error("Error al eliminar.");
        }
        setLoading(false);
    };

    // Helper para obtener nombre de sucursal
    const getBranchName = (branchId: string) => {
        if (!branchId) return "SIN ASIGNAR";
        // Si branchId es un objeto (populate), usamos _id o id. Si es string, comparamos directo.
        const idToCompare = typeof branchId === 'object' ? (branchId as any)._id || (branchId as any).id : branchId;
        const branch = branches.find(b => b.id === idToCompare || b._id === idToCompare);
        return branch ? branch.name : "SUCURSAL ELIMINADA";
    };

    return (
        <div className="space-y-6">
            {/* CABECERA */}
            <div className="flex justify-between items-center px-2">
                <div>
                    <h2 className="text-xl font-black tracking-tight uppercase text-slate-800">Puntos de Venta (Cajas)</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Administración de terminales y sucursales</p>
                </div>
                <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl"
                >
                    <Plus size={16} className="mr-2" /> Nueva Caja
                </Button>
            </div>

            {/* TABLA DE DATOS */}
            <div className="border border-slate-100 rounded-[2.5rem] bg-white shadow-2xl shadow-slate-200/50 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50 h-14">
                        <TableRow className="border-b border-slate-100 hover:bg-transparent">
                            <TableHead className="font-black text-[10px] uppercase text-slate-400 px-8">Nombre de Caja</TableHead>
                            <TableHead className="font-black text-[10px] uppercase text-slate-400">Sucursal Asignada</TableHead>
                            <TableHead className="font-black text-[10px] uppercase text-slate-400">Estado Actual</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase text-slate-400 px-8 tracking-widest">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {registers && registers.length > 0 ? (
                            registers.map((reg) => (
                                <TableRow key={reg.id} className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all">
                                    <TableCell className="py-5 px-8 font-black uppercase text-slate-800 text-xs">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                                currentTerminalId === reg.id ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600"
                                            )}>
                                                <Monitor size={16} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span>{reg.name}</span>
                                                {currentTerminalId === reg.id && (
                                                    <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full w-fit mt-0.5 border border-indigo-100 flex items-center gap-1">
                                                        <Laptop size={8} /> TÚ EQUIPO
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase">
                                            <Store size={14} className="text-slate-400" />
                                            {/* Si reg.branch_id viene populado, usamos su nombre directo, sino buscamos */}
                                            {reg.branch_id?.name || getBranchName(reg.branch_id)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${reg.status === 'open' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {reg.status === 'open' ? 'Abierta' : 'Cerrada'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right px-8">
                                        <div className="flex justify-end gap-2 items-center">
                                            {currentTerminalId !== reg.id && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSetTerminal(reg.id)}
                                                    className="h-8 text-[9px] font-black uppercase tracking-widest border-indigo-200 text-indigo-700 hover:bg-indigo-50 mr-2 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    usar aquí
                                                </Button>
                                            )}
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <Button variant="ghost" size="icon" onClick={() => { setRegisterToEdit({ ...reg, branch_id: reg.branch_id?._id || reg.branch_id || "null" }); setIsEditDialogOpen(true); }} className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={14} /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => { setRegisterToDelete(reg); setIsDeleteDialogOpen(true); }} className="h-9 w-9 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={14} /></Button>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="h-40 text-center text-slate-300 uppercase font-black text-[10px]">No hay Cajas registradas</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* MODAL NUEVA CAJA */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">
                            Nueva Caja
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-6 flex flex-col gap-6 bg-white text-slate-900">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Identificativo</Label>
                            <Input
                                value={newRegister.name}
                                onChange={(e) => setNewRegister({ ...newRegister, name: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                                placeholder="EJ: CAJA PRINCIPAL"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Asignar a Sucursal</Label>
                            <Select value={newRegister.branch_id} onValueChange={(val) => setNewRegister({ ...newRegister, branch_id: val })}>
                                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-none px-4 font-bold uppercase text-slate-700 focus-visible:ring-1 focus-visible:ring-indigo-500">
                                    <SelectValue placeholder="Seleccionar Sucursal" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null" className="font-bold text-[10px] uppercase">-- SIN SUCURSAL / TODAS --</SelectItem>
                                    {branches.map(b => (
                                        <SelectItem key={b.id} value={b.id} className="font-bold text-[10px] uppercase">{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                            onClick={() => handleAction(newRegister, false)}
                            disabled={loading}
                            className="rounded-xl bg-slate-900 hover:bg-black text-white px-8 h-11 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200"
                        >
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Crear Caja"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL EDITAR CAJA */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">
                            Editar Caja
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-6 flex flex-col gap-6 bg-white text-slate-900">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre Identificativo</Label>
                            <Input
                                value={registerToEdit?.name || ""}
                                onChange={(e) => setRegisterToEdit({ ...registerToEdit, name: e.target.value })}
                                className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Asignar a Sucursal</Label>
                            <Select value={registerToEdit?.branch_id || "null"} onValueChange={(val) => setRegisterToEdit({ ...registerToEdit, branch_id: val })}>
                                <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-none px-4 font-bold uppercase text-slate-700 focus-visible:ring-1 focus-visible:ring-indigo-500">
                                    <SelectValue placeholder="Seleccionar Sucursal" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null" className="font-bold text-[10px] uppercase">-- SIN SUCURSAL / TODAS --</SelectItem>
                                    {branches.map(b => (
                                        <SelectItem key={b.id} value={b.id} className="font-bold text-[10px] uppercase">{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditDialogOpen(false)}
                            className="rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => handleAction(registerToEdit, true)}
                            disabled={loading}
                            className="rounded-xl bg-slate-900 hover:bg-black text-white px-8 h-11 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200"
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
                            <Ban size={32} />
                        </div>
                        <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-red-700">¿Eliminar Caja?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[11px] font-bold text-slate-500 uppercase mt-2 tracking-widest leading-relaxed">
                            Estás por eliminar <span className="text-red-600 underline font-black">{registerToDelete?.name}</span>. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </div>
                    <div className="p-6 bg-white flex justify-center gap-3 border-t border-slate-100">
                        <AlertDialogCancel className="rounded-2xl border-slate-200 font-black uppercase text-[10px] h-12 px-8 tracking-widest text-slate-400 transition-colors">Volver</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] h-12 px-10 tracking-widest shadow-lg shadow-red-100 transition-all">Eliminar</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
