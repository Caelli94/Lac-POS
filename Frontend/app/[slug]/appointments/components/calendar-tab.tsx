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

interface CalendarTabProps {
    orgId: string;
    canEdit?: boolean;
    canDelete?: boolean;
}

export function CalendarTab({ orgId, canEdit, canDelete }: CalendarTabProps) {
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [appointments, setAppointments] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchAppointments()
    }, [orgId])

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

    // Filtrar turnos para la fecha seleccionada
    const dailyAppointments = appointments.filter(app => {
        if (!date) return false;
        const appDate = new Date(app.date);
        return format(appDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'cancelled': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este turno?")) return;
        try {
            const res = await appointmentService.delete(id);
            if (res.success) {
                toast.success("Turno eliminado");
                setAppointments(prev => prev.filter(a => a._id !== id));
            }
        } catch (error) {
            toast.error("Error al eliminar");
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
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        Agenda: {date ? format(date, "EEEE d 'de' MMMM", { locale: es }) : 'Seleccione una fecha'}
                    </h3>
                    <Badge variant="outline" className="rounded-lg font-bold border-slate-200 bg-white">
                        {dailyAppointments.length} Compromisos
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
                                                        {app.client_id?.name || 'Cliente sin nombre'}
                                                    </h4>
                                                    <Badge className={`rounded-lg py-0 px-2 text-[9px] font-black uppercase ${getStatusColor(app.status)}`}>
                                                        {app.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <User size={14} className="text-indigo-400" />
                                                        {app.client_id?.phone || 'Sin télefono'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <CheckCircle2 size={14} className="text-emerald-400" />
                                                        {app.service_description}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {app.notes && (canEdit || canDelete) && (
                                                <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" title={app.notes}>
                                                    <MessageSquare size={18} />
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                    onClick={() => handleDelete(app._id)}
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
        </div>
    )
}
