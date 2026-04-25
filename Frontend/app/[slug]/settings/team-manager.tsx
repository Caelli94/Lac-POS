
'use client'

import { useState, useEffect } from 'react'
import { teamService } from '@/services/teamService'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Trash2, UserPlus, Users, Loader2, Shield } from "lucide-react"
import { toast } from 'sonner'

import { LimitReachedModal } from '@/components/limit-reached-modal'
// ...

export function TeamManager({ orgId }: { orgId: string }) {
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)
    const [newMember, setNewMember] = useState({ name: '', email: '', password: '', role: 'user' })
    const [saving, setSaving] = useState(false)

    // Limit Modal State
    const [showLimitModal, setShowLimitModal] = useState(false)
    const [limitType, setLimitType] = useState<'users' | 'products' | 'suppliers' | 'customers' | 'generic'>('generic')

    const fetchTeam = async () => {
        try {
            const data = await teamService.getTeam(orgId)
            setMembers(data)
        } catch (error) {
            toast.error('Error al cargar equipo')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (orgId) fetchTeam()
    }, [orgId])

    const handleAdd = async () => {
        if (!newMember.name || !newMember.email || !newMember.password) return
        setSaving(true)
        try {
            await teamService.addMember({ ...newMember, organizationId: orgId })
            toast.success('Miembro agregado')
            setIsOpen(false)
            setNewMember({ name: '', email: '', password: '', role: 'user' })
            fetchTeam()
        } catch (error: any) {
            const msg = error.message || error.response?.data?.message || 'Error al agregar';
            if (msg.includes('LIMIT_REACHED')) {
                setLimitType('users');
                setShowLimitModal(true);
            } else {
                toast.error(msg)
            }
        } finally {
            setSaving(false)
        }
    }

    const handleRemove = async (id: string) => {
        if (!confirm('¿Seguro quieres eliminar este usuario?')) return
        try {
            await teamService.removeMember(id)
            toast.success('Usuario eliminado')
            fetchTeam()
        } catch (error) {
            toast.error('Error al eliminar')
        }
    }

    if (loading) return <div className="p-4"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-6">
            <LimitReachedModal isOpen={showLimitModal} onClose={() => setShowLimitModal(false)} limitType={limitType} />
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Users size={20} />
                        Gestión de Equipo
                    </h3>
                    <p className="text-sm text-slate-500">Administra quién tiene acceso a esta organización.</p>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl">
                            <UserPlus size={16} className="mr-2" />
                            Agregar Miembro
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl max-h-[95vh] flex flex-col">
                        <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                            <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">Nuevo Miembro</DialogTitle>
                            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Crea una cuenta para un nuevo empleado.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 p-6 md:p-8 bg-white text-slate-900 overflow-y-auto">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nombre</Label>
                                <Input
                                    value={newMember.name}
                                    onChange={e => setNewMember({ ...newMember, name: e.target.value })}
                                    placeholder="Ej. Juan Pérez"
                                    className="h-11 rounded-xl font-bold uppercase border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</Label>
                                <Input
                                    value={newMember.email}
                                    onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                                    placeholder="juan@empresa.com"
                                    className="h-11 rounded-xl font-bold border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Contraseña</Label>
                                <Input
                                    value={newMember.password}
                                    onChange={e => setNewMember({ ...newMember, password: e.target.value })}
                                    type="password"
                                    className="h-11 rounded-xl font-bold border-slate-200 bg-slate-50/50 shadow-none px-4 text-slate-900 focus-visible:ring-1 focus-visible:ring-indigo-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rol</Label>
                                <select
                                    className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm font-bold uppercase text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 transition-all cursor-pointer"
                                    value={newMember.role}
                                    onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                                >
                                    <option value="user">Usuario (Cajero/Vendedor)</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                        </div>
                        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 shrink-0 flex-row gap-3">
                            <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</Button>
                            <Button onClick={handleAdd} disabled={saving} className="rounded-xl bg-slate-900 hover:bg-black text-white px-8 h-11 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-200 transition-all flex-1">
                                {saving ? <Loader2 className="animate-spin mr-2" /> : null}
                                Crear Usuario
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-xl overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {members.map((member) => (
                            <TableRow key={member._id}>
                                <TableCell className="font-medium">{member.name}</TableCell>
                                <TableCell>{member.email}</TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-800'
                                        }`}>
                                        {member.role === 'admin' && <Shield size={12} className="mr-1" />}
                                        {member.role === 'admin' ? 'Admin' : 'Usuario'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleRemove(member._id)}
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {members.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                    No hay miembros en el equipo aún.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
