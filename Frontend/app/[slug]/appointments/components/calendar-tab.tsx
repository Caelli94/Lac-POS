'use client'

import React, { useState, useEffect } from 'react'
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, User, MessageSquare, Trash2, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { appointmentService } from '@/services/appointmentService'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, Edit, Briefcase, Filter } from 'lucide-react'
import { AppointmentModal } from './appointment-modal'
import { professionalService } from '@/services/professionalService'

interface CalendarTabProps {
    orgId: string;
    canEdit?: boolean;
    canDelete?: boolean;
}

export function CalendarTab({ orgId, canEdit, canDelete }: CalendarTabProps) {
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [appointments, setAppointments] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false)
    const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [notesModalOpen, setNotesModalOpen] = useState(false)
    const [selectedNotes, setSelectedNotes] = useState('')
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [appointmentToEdit, setAppointmentToEdit] = useState<any>(null)
    const [professionals, setProfessionals] = useState<any[]>([])
    const [selectedProfFilter, setSelectedProfFilter] = useState<string>('all')

    useEffect(() => {
        fetchAppointments()
        fetchProfessionals()
    }, [orgId])

    const fetchProfessionals = async () => {
        const res = await professionalService.getAll(orgId)
        if (res.success) setProfessionals(res.data)
    }

    const fetchAppointments = async () => {
        setLoading(true)
        try {
            const res = await appointmentService.getAll(orgId)
            if (res.success) {
                setAppointments(res.data)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar los turnos")
        } finally {
            setLoading(false)
        }
    }

    // Filtrar turnos para la fecha seleccionada y profesional
    const dailyAppointments = appointments.filter(app => {
        if (!date) return false;
        const appDate = new Date(app.date);
        const matchesDate = format(appDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        const matchesProf = selectedProfFilter === 'all' || (app.professional_id?._id || app.professional_id) === selectedProfFilter;
        return matchesDate && matchesProf;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'PENDIENTE';
            case 'confirmed': return 'CONFIRMADO';
            case 'completed': return 'COMPLETADO';
            case 'cancelled': return 'CANCELADO';
            case 'no-show': return 'AUSENTE';
            default: return status.toUpperCase();
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'cancelled': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    }

    const handleDelete = async () => {
        if (!appointmentToDelete) return;
        setDeleting(true)
        try {
            const res = await appointmentService.delete(appointmentToDelete);
            if (res.success) {
                toast.success("Turno eliminado");
                setAppointments(prev => prev.filter(a => a._id !== appointmentToDelete));
                setDeleteModalOpen(false);
            }
        } catch (error) {
            toast.error("Error al eliminar");
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            {/* LADO IZQUIERDO: CALENDARIO */}
            <div className="lg:col-span-4 space-y-6">
                <Card className="border-slate-200 shadow-sm overflow-hidden rounded-3xl bg-white">
                    <CardContent className="p-4">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={es}
                            className="w-full"
                            modifiers={{
                                booked: appointments.map(app => new Date(app.date))
                            }}
                            modifiersStyles={{
                                booked: { fontWeight: '900', color: '#6366f1', textDecoration: 'underline' }
                            }}
                            modifiersClassNames={{
                                booked: "bg-indigo-50 text-indigo-600 font-bold border border-indigo-100 rounded-full"
                            }}
                        />
                    </CardContent>
                </Card>

                <Card className="bg-indigo-600 text-white rounded-3xl p-6 shadow-xl shadow-indigo-100 border-none">
                    <h4 className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Resumen</h4>
                    <div className="text-3xl font-black mb-1">{dailyAppointments.length}</div>
                    <p className="text-sm font-medium opacity-90 italic">Turnos para hoy</p>
                </Card>
            </div>

            {/* LADO DERECHO: AGENDA DEL DÍA */}
            <div className="lg:col-span-8 flex flex-col space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Filter size={18} className="text-slate-400" />
                        <select 
                            className="bg-white border-slate-200 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-tight outline-none focus:ring-2 focus:ring-indigo-600/10 cursor-pointer shadow-sm"
                            value={selectedProfFilter}
                            onChange={(e) => setSelectedProfFilter(e.target.value)}
                        >
                            <option value="all">TODOS LOS PROFESIONALES</option>
                            {professionals.map(p => (
                                <option key={p._id} value={p._id}>{p.name.toUpperCase()}</option>
                            ))}
                        </select>
                    </div>
                    <Badge variant="outline" className="rounded-lg font-bold border-slate-200 bg-white px-4 py-2">
                        {dailyAppointments.length} Turnos {selectedProfFilter !== 'all' ? 'del Profesional' : ''}
                    </Badge>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                            <p className="text-xs font-black uppercase tracking-widest italic">Sincronizando Turnos...</p>
                        </div>
                    ) : dailyAppointments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                            <Clock size={48} className="text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold text-sm italic">No hay turnos agendados para este día.</p>
                        </div>
                    ) : (
                        dailyAppointments.map((app) => (
                            <Card key={app._id} className="group border-slate-100 hover:border-indigo-200 hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-white">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col items-center justify-center w-20 h-20 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                                <span className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                    {format(new Date(app.date), 'HH:mm')}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Hora</span>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-lg font-black text-slate-900 capitalize">
                                                        {app.client_id?.name || app.guest_name || 'Cliente sin nombre'}
                                                    </h4>
                                                    <Badge className={`rounded-lg py-0 px-2 text-[9px] font-black uppercase ${getStatusColor(app.status)}`}>
                                                        {getStatusLabel(app.status)}
                                                    </Badge>
                                                </div>
                                                 <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <User size={14} className="text-indigo-400" />
                                                        {app.client_id?.phone || app.guest_phone || 'Sin télefono'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                                        {app.service_description}
                                                    </span>
                                                    {app.professional_id && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100" style={{ color: app.professional_id.color }}>
                                                            <Briefcase size={12} />
                                                            <span className="font-bold text-[10px] uppercase">
                                                                {app.professional_id.name}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {app.notes && (canEdit || canDelete) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                    onClick={() => {
                                                        setSelectedNotes(app.notes);
                                                        setNotesModalOpen(true);
                                                    }}
                                                >
                                                    <MessageSquare size={18} />
                                                </Button>
                                            )}
                                            {canEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                    onClick={() => {
                                                        setAppointmentToEdit(app);
                                                        setEditModalOpen(true);
                                                    }}
                                                >
                                                    <Edit size={18} />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                    onClick={() => {
                                                        setAppointmentToDelete(app._id);
                                                        setDeleteModalOpen(true);
                                                    }}
                                                >
                                                    <Trash2 size={18} />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* MODAL DE ELIMINACIÓN */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Eliminar Turno?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-destructive">
                            <AlertTriangle size={32} />
                        </div>
                        <p className="text-sm font-medium text-slate-500">Esta acción no se puede deshacer. El turno será eliminado permanentemente.</p>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} className="rounded-xl h-12 font-bold uppercase text-[10px]">Cancelar</Button>
                            <Button onClick={handleDelete} disabled={deleting} className="bg-destructive text-white rounded-xl h-12 font-black uppercase text-[10px]">
                                {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL DE NOTAS */}
            <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Notas del Turno</DialogTitle>
                    </DialogHeader>
                    <div className="pt-4">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 text-sm italic font-medium">
                            "{selectedNotes}"
                        </div>
                        <Button onClick={() => setNotesModalOpen(false)} className="w-full mt-6 bg-slate-900 text-white rounded-xl h-12 font-black uppercase text-[10px]">
                            Cerrar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL DE EDICIÓN */}
            <AppointmentModal
                isOpen={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false);
                    setAppointmentToEdit(null);
                }}
                orgId={orgId}
                onSuccess={() => {
                    fetchAppointments();
                }}
                appointmentToEdit={appointmentToEdit}
            />
        </div>
    )
}
