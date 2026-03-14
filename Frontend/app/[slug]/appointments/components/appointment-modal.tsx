'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Search, User, CalendarDays, Clock, CheckCircle2, X } from 'lucide-react'
import { customerService } from '@/services/customerService'
import { appointmentService } from '@/services/appointmentService'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    orgId: string;
    onSuccess: () => void;
    initialDate?: Date;
}

export function AppointmentModal({ isOpen, onClose, orgId, onSuccess, initialDate }: AppointmentModalProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [customers, setCustomers] = useState<any[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [date, setDate] = useState(initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
    const [time, setTime] = useState('09:00')
    const [service, setService] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)

    // Buscador reactivo de clientes
    useEffect(() => {
        if (searchQuery.length < 3) {
            setCustomers([])
            return
        }

        const timer = setTimeout(async () => {
            setSearching(true)
            try {
                // El backend parece tener /api/customers/:orgId
                const res = await customerService.getAll(orgId)
                const list = Array.isArray(res) ? res : (res.data || [])
                const filtered = list.filter((c: any) =>
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (c.phone && c.phone.includes(searchQuery))
                )
                setCustomers(filtered)
            } catch (error) {
                console.error(error)
            } finally {
                setSearching(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery, orgId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCustomer) return toast.error("Debe seleccionar un cliente")
        if (!service) return toast.error("Debe describir el servicio")

        setLoading(true)
        try {
            const appointmentDate = new Date(`${date}T${time}:00`);
            const res = await appointmentService.create({
                organization_id: orgId,
                client_id: selectedCustomer._id,
                date: appointmentDate,
                service_description: service,
                notes
            })

            if (res.success) {
                toast.success("Turno agendado correctamente")
                onSuccess()
                onClose()
                resetForm()
            }
        } catch (error) {
            toast.error("Error al agendar el turno")
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setSelectedCustomer(null)
        setSearchQuery('')
        setService('')
        setNotes('')
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden flex flex-col">
                <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">
                        Agendar Nuevo Turno
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* BUSCADOR DE CLIENTES */}
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</Label>
                            {selectedCustomer ? (
                                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl animate-in zoom-in-95 duration-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 leading-none">{selectedCustomer.name}</p>
                                            <p className="text-xs font-medium text-slate-500 mt-1">{selectedCustomer.phone || 'Sin télefono'}</p>
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-rose-600 font-bold text-[10px] uppercase">
                                        Cambiar
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                                    <Input
                                        placeholder="Buscar por nombre o teléfono..."
                                        className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl font-medium focus:ring-2 focus:ring-slate-950/10 transition-all border-dashed"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full"></div>}

                                    {customers.length > 0 && (
                                        <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                                            {customers.map(c => (
                                                <div
                                                    key={c._id}
                                                    className="p-4 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-50 last:border-0"
                                                    onClick={() => setSelectedCustomer(c)}
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                                        <User size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{c.name}</p>
                                                        <p className="text-[10px] text-slate-400">{c.phone || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</Label>
                            <div className="relative">
                                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                                <Input
                                    type="date"
                                    className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950/10"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hora</Label>
                            <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                                <Input
                                    type="time"
                                    className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950/10"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Servicio / Motivo</Label>
                            <Input
                                placeholder="Ej: Corte de pelo + Barba"
                                className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-slate-950/10"
                                value={service}
                                onChange={(e) => setService(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notas Adicionales</Label>
                            <Textarea
                                placeholder="Detalles importantes..."
                                className="bg-slate-50 border-slate-200 rounded-xl min-h-[80px] font-medium focus:ring-2 focus:ring-slate-950/10"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] h-12 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-slate-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Procesando...' : (
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 size={16} /> Confirmar Reserva
                                </span>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
