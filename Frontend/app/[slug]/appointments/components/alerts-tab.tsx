'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, User, MessageCircle, Send, Calendar, CheckCircle2 } from 'lucide-react'
import { format, isToday, isTomorrow, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { appointmentService } from '@/services/appointmentService'
import { toast } from 'sonner'

interface AlertsTabProps {
    orgId: string;
}

export function AlertsTab({ orgId }: AlertsTabProps) {
    const [appointments, setAppointments] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchAlerts()
    }, [orgId])

    const fetchAlerts = async () => {
        setLoading(true)
        try {
            // Buscamos turnos desde hoy hasta dentro de 2 días para el "radar"
            const from = format(new Date(), 'yyyy-MM-dd')
            const to = format(addDays(new Date(), 2), 'yyyy-MM-dd')
            const res = await appointmentService.getAll(orgId, from, to)
            if (res.success) {
                setAppointments(res.data)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar alertas")
        } finally {
            setLoading(false)
        }
    }

    const sendWhatsApp = (app: any) => {
        const phone = app.client_id?.phone;
        if (!phone) return toast.error("El cliente no tiene teléfono registrado");

        const cleanPhone = phone.replace(/\D/g, '');
        const dateStr = format(new Date(app.date), "EEEE d 'de' MMMM", { locale: es });
        const timeStr = format(new Date(app.date), 'HH:mm');

        const message = `Hola ${app.client_id.name}! Te escribimos para recordarte tu turno del día ${dateStr} a las ${timeStr} hs por: ${app.service_description}. Te esperamos!`;
        const url = `https://wa.me/${cleanPhone.startsWith('54') ? cleanPhone : '54' + cleanPhone}?text=${encodeURIComponent(message)}`;

        window.open(url, '_blank');

        // Marcar como recordado (podría ser una llamada al backend)
        markAsReminded(app._id);
    }

    const markAsReminded = async (id: string) => {
        try {
            await appointmentService.update(id, { reminder_sent: true });
            setAppointments(prev => prev.map(a => a._id === id ? { ...a, reminder_sent: true } : a));
            toast.info("Marcado como recordado");
        } catch (error) {
            console.error(error);
        }
    }

    const todayApps = appointments.filter(a => isToday(new Date(a.date)));
    const tomorrowApps = appointments.filter(a => isTomorrow(new Date(a.date)));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ESTADÍSTICAS RÁPIDAS DEL RADAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none bg-indigo-50/50 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Total Radar</span>
                    <span className="text-4xl font-black text-indigo-600">{appointments.length}</span>
                    <span className="text-xs font-medium text-slate-500 mt-1">Turnos próximos</span>
                </Card>
                <Card className="border-none bg-amber-50 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Hoy</span>
                    <span className="text-4xl font-black text-amber-600">{todayApps.length}</span>
                    <span className="text-xs font-medium text-slate-500 mt-1">Pendientes de atención</span>
                </Card>
                <Card className="border-none bg-emerald-50 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Recordatorios</span>
                    <span className="text-4xl font-black text-emerald-600">{appointments.filter(a => a.reminder_sent).length}</span>
                    <span className="text-xs font-medium text-slate-500 mt-1">Mensajes enviados</span>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* SECCIÓN HOY */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3 px-4">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Citas para Hoy</h3>
                    </div>

                    <div className="space-y-4">
                        {todayApps.length === 0 ? (
                            <div className="p-12 text-center bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                <p className="text-slate-400 font-bold italic text-sm">No hay citas para el día de hoy.</p>
                            </div>
                        ) : todayApps.map(app => (
                            <AlertItem key={app._id} app={app} onSend={() => sendWhatsApp(app)} />
                        ))}
                    </div>
                </section>

                {/* SECCIÓN MAÑANA */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3 px-4">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Citas para Mañana</h3>
                    </div>

                    <div className="space-y-4">
                        {tomorrowApps.length === 0 ? (
                            <div className="p-12 text-center bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                <p className="text-slate-400 font-bold italic text-sm">No hay citas para mañana.</p>
                            </div>
                        ) : tomorrowApps.map(app => (
                            <AlertItem key={app._id} app={app} onSend={() => sendWhatsApp(app)} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}

function AlertItem({ app, onSend }: { app: any; onSend: () => void }) {
    return (
        <Card className="group border-slate-100 hover:border-indigo-200 rounded-[2rem] overflow-hidden transition-all duration-300 bg-white">
            <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                            <span className="text-sm font-black text-slate-900 leading-none">{format(new Date(app.date), 'HH:mm')}</span>
                            <span className="text-[8px] font-bold text-slate-400 tracking-tighter uppercase mt-1">Hora</span>
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-black text-slate-900 capitalize leading-none">{app.client_id?.name || 'Cliente'}</h4>
                            <p className="text-xs font-medium text-slate-500 truncate max-w-[200px]">{app.service_description}</p>
                            <div className="flex items-center gap-2 mt-2">
                                {app.reminder_sent ? (
                                    <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200 text-[8px] font-black uppercase px-2 py-0">Recordado</Badge>
                                ) : (
                                    <Badge className="bg-slate-100 text-slate-400 border-slate-200 text-[8px] font-black uppercase px-2 py-0">Pendiente</Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={onSend}
                        className="w-12 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-100 transition-all hover:scale-110 active:scale-90"
                    >
                        <MessageCircle size={24} />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
