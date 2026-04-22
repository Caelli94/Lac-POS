'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { 
    Clock, 
    MessageSquare, 
    Globe, 
    Calendar, 
    Save, 
    Info, 
    CheckCircle2, 
    AlertCircle,
    ChevronRight,
    Copy,
    Settings2
} from 'lucide-react'
import { organizationService } from '@/services/organizationService'
import { professionalService } from '@/services/professionalService'
import { toast } from 'sonner'
import { Plus, User as UserIcon, Trash2, Edit, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface ConfigTabProps {
    org: any;
}

export function ConfigTab({ org }: ConfigTabProps) {
    const [loading, setLoading] = useState(false)
    const [settings, setSettings] = useState({
        working_hours: org?.settings?.appointments?.working_hours || [
            { day: 'Lunes', enabled: true, start: '09:00', end: '18:00' },
            { day: 'Martes', enabled: true, start: '09:00', end: '18:00' },
            { day: 'Miércoles', enabled: true, start: '09:00', end: '18:00' },
            { day: 'Jueves', enabled: true, start: '09:00', end: '18:00' },
            { day: 'Viernes', enabled: true, start: '09:00', end: '18:00' },
            { day: 'Sábado', enabled: false, start: '09:00', end: '13:00' },
            { day: 'Domingo', enabled: false, start: '09:00', end: '13:00' },
        ],
        default_duration: org?.settings?.appointments?.default_duration || 30,
        whatsapp_template: org?.settings?.appointments?.whatsapp_template || 'Hola {{client}}! Te recordamos tu turno el {{date}} a las {{time}} hs por {{service}}. Te esperamos!',
        self_booking_enabled: org?.settings?.appointments?.self_booking_enabled || false,
        max_booking_days: org?.settings?.appointments?.max_booking_days || 30
    })
    const [professionals, setProfessionals] = useState<any[]>([])
    const [isAddProfessionalOpen, setIsAddProfessionalOpen] = useState(false)
    const [newProf, setNewProf] = useState({
        name: '',
        specialty: '',
        phone: '',
        color: '#6366f1'
    })
    const [editingProf, setEditingProf] = useState<any>(null)
    const [isEditProfOpen, setIsEditProfOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [profToDelete, setProfToDelete] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    const handleCopyLink = () => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'pos.lac.com';
        const link = `${baseUrl}/booking/${org.slug}`
        navigator.clipboard.writeText(link)
        toast.success("Enlace copiado al portapapeles")
    }

    useEffect(() => {
        fetchProfessionals()
    }, [org])

    const fetchProfessionals = async () => {
        const res = await professionalService.getAll(org._id || org.id)
        if (res.success) setProfessionals(res.data)
    }

    const handleAddProfessional = async () => {
        if (!newProf.name) return toast.error("El nombre es obligatorio")
        setLoading(true)
        try {
            const res = await professionalService.create({
                organization_id: org._id || org.id,
                ...newProf,
                working_hours: settings.working_hours // Default from org
            })
            if (res.success) {
                toast.success("Profesional añadido")
                setIsAddProfessionalOpen(false)
                setNewProf({ name: '', specialty: '', phone: '', color: '#6366f1' })
                fetchProfessionals()
            }
        } catch (error) {
            toast.error("Error al añadir profesional")
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteProfessional = async () => {
        if (!profToDelete) return
        setDeleting(true)
        try {
            const res = await professionalService.delete(profToDelete)
            if (res.success) {
                toast.success("Profesional eliminado")
                fetchProfessionals()
                setIsDeleteModalOpen(false)
            }
        } catch (error) {
            toast.error("Error al eliminar profesional")
        } finally {
            setDeleting(false)
        }
    }

    const handleUpdateProfessional = async () => {
        if (!editingProf.name) return toast.error("El nombre es obligatorio")
        setLoading(true)
        try {
            const res = await professionalService.update(editingProf._id, {
                name: editingProf.name,
                specialty: editingProf.specialty,
                color: editingProf.color,
                working_hours: editingProf.working_hours
            })
            if (res.success) {
                toast.success("Profesional actualizado")
                setIsEditProfOpen(false)
                fetchProfessionals()
            }
        } catch (error) {
            toast.error("Error al actualizar profesional")
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateProfessionalHours = async (id: string, hours: any) => {
        // Obsoleto, integrado en handleUpdateProfessional
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            // Asegurarnos de que estamos enviando el objeto settings completo al endpoint de la organización
            const response = await organizationService.update(org._id || org.id, { 
                settings: {
                    ...org.settings,
                    appointments: settings
                }
            })
            if (response) {
                toast.success("Configuración general guardada")
            } else {
                toast.error("Error al guardar la configuración")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al procesar la solicitud")
        } finally {
            setLoading(false)
        }
    }

    const updateWorkingDay = (index: number, field: string, value: any) => {
        const newHours = [...settings.working_hours]
        newHours[index] = { ...newHours[index], [field]: value }
        setSettings({ ...settings, working_hours: newHours })
    }

    // Effect to ensure settings are always initialized from org or defaults
    useEffect(() => {
        if (org?.settings?.appointments) {
            const orgHours = org.settings.appointments.working_hours;
            setSettings({
                working_hours: (orgHours && orgHours.length > 0) ? orgHours.map((h: any) => ({
                    ...h,
                    slots: h.slots || [{ start: h.start || '09:00', end: h.end || '18:00' }]
                })) : [
                    { day: 'Lunes', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
                    { day: 'Martes', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
                    { day: 'Miércoles', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
                    { day: 'Jueves', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
                    { day: 'Viernes', enabled: true, slots: [{ start: '09:00', end: '18:00' }] },
                    { day: 'Sábado', enabled: false, slots: [{ start: '09:00', end: '13:00' }] },
                    { day: 'Domingo', enabled: false, slots: [{ start: '09:00', end: '13:00' }] },
                ],
                default_duration: org.settings.appointments.default_duration || 30,
                whatsapp_template: org.settings.appointments.whatsapp_template || 'Hola {{client}}! Te recordamos tu turno el {{date}} a las {{time}} hs por {{service}}. Te esperamos!',
                self_booking_enabled: org.settings.appointments.self_booking_enabled || false,
                max_booking_days: org.settings.appointments.max_booking_days || 30,
                whatsapp_number: org.settings.appointments.whatsapp_number || ''
            })
        }
    }, [org])

    const addSlot = (dayIdx: number, target: 'settings' | 'newProf' | 'editingProf') => {
        if (target === 'settings') {
            const newHours = [...settings.working_hours];
            newHours[dayIdx].slots.push({ start: '09:00', end: '18:00' });
            setSettings({ ...settings, working_hours: newHours });
        } else if (target === 'newProf') {
            const newHours = [...(newProf as any).working_hours];
            newHours[dayIdx].slots.push({ start: '09:00', end: '18:00' });
            setNewProf({ ...newProf, working_hours: newHours } as any);
        } else if (target === 'editingProf') {
            const newHours = [...editingProf.working_hours];
            newHours[dayIdx].slots.push({ start: '09:00', end: '18:00' });
            setEditingProf({ ...editingProf, working_hours: newHours });
        }
    }

    const removeSlot = (dayIdx: number, slotIdx: number, target: 'settings' | 'newProf' | 'editingProf') => {
        if (target === 'settings') {
            const newHours = [...settings.working_hours];
            if (newHours[dayIdx].slots.length > 1) {
                newHours[dayIdx].slots.splice(slotIdx, 1);
                setSettings({ ...settings, working_hours: newHours });
            }
        } else if (target === 'newProf') {
            const newHours = [...(newProf as any).working_hours];
            if (newHours[dayIdx].slots.length > 1) {
                newHours[dayIdx].slots.splice(slotIdx, 1);
                setNewProf({ ...newProf, working_hours: newHours } as any);
            }
        } else if (target === 'editingProf') {
            const newHours = [...editingProf.working_hours];
            if (newHours[dayIdx].slots.length > 1) {
                newHours[dayIdx].slots.splice(slotIdx, 1);
                setEditingProf({ ...editingProf, working_hours: newHours });
            }
        }
    }

    const updateSlot = (dayIdx: number, slotIdx: number, field: 'start' | 'end', value: string, target: 'settings' | 'newProf' | 'editingProf') => {
        if (target === 'settings') {
            const newHours = [...settings.working_hours];
            newHours[dayIdx].slots[slotIdx][field] = value;
            setSettings({ ...settings, working_hours: newHours });
        } else if (target === 'newProf') {
            const newHours = [...(newProf as any).working_hours];
            newHours[dayIdx].slots[slotIdx][field] = value;
            setNewProf({ ...newProf, working_hours: newHours } as any);
        } else if (target === 'editingProf') {
            const newHours = [...editingProf.working_hours];
            newHours[dayIdx].slots[slotIdx][field] = value;
            setEditingProf({ ...editingProf, working_hours: newHours });
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-end">
                <Button 
                    onClick={handleSave} 
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] px-8 h-12 tracking-widest rounded-2xl shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
                >
                    {loading ? 'Guardando...' : <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</>}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* HORARIOS DE ATENCIÓN */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black uppercase tracking-tight">Horarios de Atención</CardTitle>
                                    <CardDescription className="text-xs font-medium">Define los días y rangos horarios disponibles para turnos.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-4">
                            {settings.working_hours.map((day: any, index: number) => (
                                <div key={day.day} className="flex flex-col p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 hover:bg-slate-50 transition-colors gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 min-w-[120px]">
                                            <Switch 
                                                checked={day.enabled} 
                                                onCheckedChange={(val) => updateWorkingDay(index, 'enabled', val)}
                                            />
                                            <span className={`font-black uppercase tracking-tighter text-sm ${day.enabled ? 'text-slate-900' : 'text-slate-400'}`}>{day.day}</span>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => addSlot(index, 'settings')}
                                            disabled={!day.enabled}
                                            className="h-8 rounded-xl text-indigo-600 font-bold uppercase text-[10px] hover:bg-indigo-50"
                                        >
                                            <Plus size={14} className="mr-1" /> Añadir Rango
                                        </Button>
                                    </div>
                                    
                                    <div className={`space-y-3 transition-opacity ${day.enabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                        {day.slots?.map((slot: any, sIdx: number) => (
                                            <div key={sIdx} className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                                <Input 
                                                    type="time" 
                                                    className="h-10 w-32 bg-white rounded-xl font-bold text-xs" 
                                                    value={slot.start}
                                                    onChange={(e) => updateSlot(index, sIdx, 'start', e.target.value, 'settings')}
                                                />
                                                <span className="text-slate-400 font-black text-[10px]">A</span>
                                                <Input 
                                                    type="time" 
                                                    className="h-10 w-32 bg-white rounded-xl font-bold text-xs" 
                                                    value={slot.end}
                                                    onChange={(e) => updateSlot(index, sIdx, 'end', e.target.value, 'settings')}
                                                />
                                                {day.slots.length > 1 && (
                                                    <Button variant="ghost" size="icon" onClick={() => removeSlot(index, sIdx, 'settings')} className="h-10 w-10 text-slate-300 hover:text-rose-500">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* PROFESIONALES */}
                    <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600">
                                    <UserIcon size={24} />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black uppercase tracking-tight">Staff / Profesionales</CardTitle>
                                    <CardDescription className="text-xs font-medium">Gestiona el equipo y sus agendas individuales.</CardDescription>
                                </div>
                            </div>
                            <Dialog open={isAddProfessionalOpen} onOpenChange={(val) => {
                                setIsAddProfessionalOpen(val);
                                if (val) {
                                    setNewProf({
                                        name: '',
                                        specialty: '',
                                        phone: '',
                                        color: '#6366f1',
                                        working_hours: JSON.parse(JSON.stringify(settings.working_hours))
                                    } as any);
                                }
                            }}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="bg-black text-white rounded-xl font-black uppercase text-[10px] px-4">
                                        <Plus className="mr-2 h-4 w-4" /> Añadir Profesional
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl bg-white rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden flex flex-col">
                                    <DialogHeader className="bg-slate-50 p-8 border-b border-slate-100">
                                        <DialogTitle className="text-xl font-black uppercase">Nuevo Profesional</DialogTitle>
                                        <p className="text-xs font-medium text-slate-500">Completa los datos y define su agenda inicial.</p>
                                    </DialogHeader>
                                    
                                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Información General</h4>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase">Nombre Completo</Label>
                                                    <Input 
                                                        placeholder="Ej: Dr. Juan Pérez" 
                                                        value={newProf.name}
                                                        onChange={(e) => setNewProf({...newProf, name: e.target.value})}
                                                        className="rounded-xl bg-slate-50 border-slate-200"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase">Especialidad / Rubro</Label>
                                                    <Input 
                                                        placeholder="Ej: Kinesiología Deportiva" 
                                                        value={newProf.specialty}
                                                        onChange={(e) => setNewProf({...newProf, specialty: e.target.value})}
                                                        className="rounded-xl bg-slate-50 border-slate-200"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase">Color en Agenda</Label>
                                                    <div className="flex items-center gap-3">
                                                        <Input 
                                                            type="color" 
                                                            value={newProf.color} 
                                                            onChange={(e) => setNewProf({...newProf, color: e.target.value})}
                                                            className="w-10 h-10 p-0 border-none rounded-xl cursor-pointer bg-transparent overflow-hidden"
                                                        />
                                                        <div className="flex gap-1">
                                                            {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'].map(c => (
                                                                <div 
                                                                    key={c} 
                                                                    onClick={() => setNewProf({...newProf, color: c})}
                                                                    className={`w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110 ${newProf.color === c ? 'ring-2 ring-offset-2 ring-black' : ''}`}
                                                                    style={{ backgroundColor: c }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Disponibilidad</h4>
                                            <div className="space-y-3">
                                                {(newProf as any).working_hours?.map((day: any, idx: number) => (
                                                    <div key={day.day} className="flex flex-col p-4 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Switch 
                                                                    checked={day.enabled} 
                                                                    onCheckedChange={(val) => {
                                                                        const newHours = [...(newProf as any).working_hours];
                                                                        newHours[idx] = { ...newHours[idx], enabled: val };
                                                                        setNewProf({ ...newProf, working_hours: newHours } as any);
                                                                    }}
                                                                />
                                                                <span className="font-bold text-[10px] uppercase text-slate-500">{day.day}</span>
                                                            </div>
                                                            <Button variant="ghost" size="sm" onClick={() => addSlot(idx, 'newProf')} className="h-6 text-indigo-600 text-[10px] font-bold p-0">+ Rango</Button>
                                                        </div>
                                                        <div className={`space-y-2 ${day.enabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                                            {day.slots?.map((slot: any, sIdx: number) => (
                                                                <div key={sIdx} className="flex items-center gap-1">
                                                                    <Input type="time" className="h-7 w-20 text-[10px] font-bold" value={slot.start} onChange={(e) => updateSlot(idx, sIdx, 'start', e.target.value, 'newProf')} />
                                                                    <Input type="time" className="h-7 w-20 text-[10px] font-bold" value={slot.end} onChange={(e) => updateSlot(idx, sIdx, 'end', e.target.value, 'newProf')} />
                                                                    {day.slots.length > 1 && (
                                                                        <Button variant="ghost" size="icon" onClick={() => removeSlot(idx, sIdx, 'newProf')} className="h-6 w-6 text-rose-500"><X size={12} /></Button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                                        <Button 
                                            onClick={handleAddProfessional} 
                                            disabled={loading}
                                            className="w-full bg-indigo-600 text-white rounded-2xl h-14 font-black uppercase tracking-widest shadow-xl shadow-indigo-100"
                                        >
                                            {loading ? 'Creando...' : 'Confirmar y Crear Profesional'}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {professionals.length === 0 ? (
                                    <div className="col-span-2 p-12 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                                        <p className="text-slate-400 font-bold italic text-sm">No hay profesionales registrados.</p>
                                    </div>
                                ) : professionals.map(p => (
                                    <div key={p._id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: p.color }}>
                                                <UserIcon size={20} />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-sm leading-none">{p.name}</p>
                                                <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase">{p.specialty || 'Sin especialidad'}</p>
                                            </div>
                                        </div>
                                            <div className="flex items-center gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-400 hover:text-blue-600" 
                                                    onClick={() => {
                                                        // Ensure working_hours exists
                                                        const prof = { ...p };
                                                        if (!prof.working_hours || prof.working_hours.length === 0) {
                                                            prof.working_hours = settings.working_hours;
                                                        }
                                                        setEditingProf(prof);
                                                        setIsEditProfOpen(true);
                                                    }}
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-400 hover:text-rose-600" 
                                                    onClick={() => {
                                                        setProfToDelete(p._id);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* PLANTILLA WHATSAPP */}
                    <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600">
                                    <MessageSquare size={24} />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black uppercase tracking-tight">Plantilla de WhatsApp</CardTitle>
                                    <CardDescription className="text-xs font-medium">Personaliza el mensaje que se envía a los clientes.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mensaje de Recordatorio</Label>
                                <Textarea 
                                    className="min-h-[120px] bg-slate-50 border-slate-200 rounded-2xl font-medium p-6 focus:ring-2 focus:ring-indigo-600/10"
                                    value={settings.whatsapp_template}
                                    onChange={(e) => setSettings({...settings, whatsapp_template: e.target.value})}
                                />
                                <div className="flex flex-wrap gap-2">
                                    {['client', 'date', 'time', 'service'].map(tag => (
                                        <span key={tag} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase cursor-pointer hover:bg-indigo-100 transition-colors"
                                            onClick={() => setSettings({...settings, whatsapp_template: settings.whatsapp_template + ` {{${tag}}}`})}
                                        >
                                            + {'{{' + tag + '}}'}
                                        </span>
                                    ))}
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-2">
                                        <Info size={14} /> TIP: Usa las etiquetas de arriba para que el sistema complete los datos automáticamente.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    {/* DURACIÓN POR DEFECTO */}
                    <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                    <Calendar size={20} />
                                </div>
                                <h4 className="font-black uppercase tracking-tight text-sm">Duración por Defecto</h4>
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between items-end">
                                    <span className="text-4xl font-black text-indigo-600">{settings.default_duration}</span>
                                    <span className="text-xs font-black uppercase text-slate-400 pb-1">Minutos</span>
                                </div>
                                <Slider 
                                    defaultValue={[settings.default_duration]} 
                                    max={120} 
                                    step={5} 
                                    onValueChange={(val) => setSettings({...settings, default_duration: val[0]})}
                                />
                                <p className="text-[10px] font-medium text-slate-500 italic text-center">
                                    Se usará para calcular el fin de la cita automáticamente.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* RESERVA PÚBLICA */}
                    <Card className="border-none shadow-sm rounded-[2.5rem] bg-indigo-900 text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Globe size={120} />
                        </div>
                        <CardContent className="p-8 space-y-6 relative z-10">
                            <div>
                                <h4 className="text-lg font-black uppercase tracking-tight mb-2">Reserva Online</h4>
                                <p className="text-xs font-medium text-indigo-200 leading-relaxed">
                                    Permite que tus clientes agenden sus propios turnos desde una página pública.
                                </p>
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                                <span className="font-black uppercase text-[10px] tracking-widest">Activar Landing</span>
                                <Switch 
                                    checked={settings.self_booking_enabled}
                                    onCheckedChange={(val) => setSettings({...settings, self_booking_enabled: val})}
                                />
                            </div>

                            {settings.self_booking_enabled && (
                                <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">WhatsApp de Reservas (Ej: 3584123456)</Label>
                                        <Input 
                                            value={settings.whatsapp_number || ''}
                                            onChange={(e) => setSettings({...settings, whatsapp_number: e.target.value})}
                                            placeholder="3584000000"
                                            className="h-12 rounded-xl bg-white border-slate-200 font-bold text-slate-900"
                                        />
                                        <p className="text-[10px] font-medium text-indigo-200 uppercase">Sin el 0 y sin el 15. Usaremos 549 por defecto.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase text-slate-400">Ventana de Reserva (Días)</Label>
                                        <div className="flex items-center gap-4">
                                            <Input 
                                                type="number"
                                                value={settings.max_booking_days || 0}
                                                onChange={(e) => setSettings({...settings, max_booking_days: parseInt(e.target.value) || 0})}
                                                className="h-12 rounded-xl bg-white border-slate-200 font-bold w-24 text-slate-900"
                                            />
                                            <p className="text-[10px] font-medium text-indigo-200 uppercase">Días máximos hacia el futuro que el cliente puede agendar.</p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <p className="text-[10px] font-medium text-indigo-100 mb-2">Tu enlace público:</p>
                                        <code className="text-[10px] font-black text-white bg-black/20 p-2 rounded-lg block truncate">
                                            {typeof window !== 'undefined' ? window.location.origin : 'pos.lac.com'}/booking/{org.slug}
                                        </code>
                                    </div>
                                    <Button 
                                        onClick={handleCopyLink}
                                        className="w-full bg-white text-indigo-900 hover:bg-indigo-50 font-black uppercase text-[10px] h-12 rounded-xl"
                                    >
                                        <Copy className="mr-2 h-4 w-4" /> Copiar Enlace
                                    </Button>
                                </div>
                            )}

                            {!settings.self_booking_enabled && (
                                <div className="p-4 bg-amber-400/20 rounded-2xl border border-amber-400/30">
                                    <p className="text-[10px] font-black text-amber-200 uppercase flex items-center gap-2">
                                        <AlertCircle size={14} /> Función Premium
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* PRÓXIMAMENTE */}
                    <div className="p-6 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center text-center space-y-2">
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                            <ChevronRight size={20} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Más funciones en camino...</p>
                    </div>
                </div>
            </div>

            {/* DIALOG PARA EDITAR PROFESIONAL COMPLETO */}
            <Dialog open={isEditProfOpen} onOpenChange={setIsEditProfOpen}>
                <DialogContent className="max-w-3xl bg-white rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden flex flex-col">
                    <DialogHeader className="bg-slate-50 p-8 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: editingProf?.color }}>
                                    <UserIcon size={28} />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Editar Profesional</DialogTitle>
                                    <p className="text-xs font-medium text-slate-500">Configura los datos y la disponibilidad de {editingProf?.name}.</p>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* DATOS BÁSICOS */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Información General</h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Nombre Completo</Label>
                                    <Input 
                                        value={editingProf?.name}
                                        onChange={(e) => setEditingProf({...editingProf, name: e.target.value})}
                                        className="rounded-xl bg-slate-50 border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Especialidad / Rubro</Label>
                                    <Input 
                                        value={editingProf?.specialty}
                                        onChange={(e) => setEditingProf({...editingProf, specialty: e.target.value})}
                                        className="rounded-xl bg-slate-50 border-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Color en Agenda</Label>
                                    <div className="flex items-center gap-3">
                                        <Input 
                                            type="color" 
                                            value={editingProf?.color} 
                                            onChange={(e) => setEditingProf({...editingProf, color: e.target.value})}
                                            className="w-12 h-12 p-0 border-none rounded-xl cursor-pointer bg-transparent overflow-hidden"
                                        />
                                        <div className="flex gap-1">
                                            {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'].map(c => (
                                                <div 
                                                    key={c} 
                                                    onClick={() => setEditingProf({...editingProf, color: c})}
                                                    className={`w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110 ${editingProf?.color === c ? 'ring-2 ring-offset-2 ring-black' : ''}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* HORARIOS */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Disponibilidad Semanal</h4>
                            <div className="space-y-3">
                                {editingProf?.working_hours?.map((day: any, idx: number) => (
                                    <div key={day.day} className="flex flex-col p-4 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Switch 
                                                    checked={day.enabled} 
                                                    onCheckedChange={(val) => {
                                                        const newHours = [...editingProf.working_hours];
                                                        newHours[idx] = { ...newHours[idx], enabled: val };
                                                        setEditingProf({ ...editingProf, working_hours: newHours });
                                                    }}
                                                />
                                                <span className={`font-bold text-[10px] uppercase ${day.enabled ? 'text-slate-900' : 'text-slate-400'}`}>{day.day}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => addSlot(idx, 'editingProf')} disabled={!day.enabled} className="h-6 text-indigo-600 text-[10px] font-bold p-0">+ Rango</Button>
                                        </div>
                                        <div className={`space-y-2 transition-opacity ${day.enabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                            {day.slots?.map((slot: any, sIdx: number) => (
                                                <div key={sIdx} className="flex items-center gap-1">
                                                    <Input 
                                                        type="time" 
                                                        className="h-8 w-24 bg-white rounded-lg font-bold text-[10px] px-2" 
                                                        value={slot.start}
                                                        onChange={(e) => updateSlot(idx, sIdx, 'start', e.target.value, 'editingProf')}
                                                    />
                                                    <Input 
                                                        type="time" 
                                                        className="h-8 w-24 bg-white rounded-lg font-bold text-[10px] px-2" 
                                                        value={slot.end}
                                                        onChange={(e) => updateSlot(idx, sIdx, 'end', e.target.value, 'editingProf')}
                                                    />
                                                    {day.slots.length > 1 && (
                                                        <Button variant="ghost" size="icon" onClick={() => removeSlot(idx, sIdx, 'editingProf')} className="h-6 w-6 text-rose-500"><X size={12} /></Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {(!editingProf?.working_hours || editingProf.working_hours.length === 0) && (
                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                                        <p className="text-[10px] font-bold text-amber-600 uppercase">Sin horarios configurados</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                        <Button variant="outline" onClick={() => setIsEditProfOpen(false)} className="flex-1 h-12 rounded-2xl font-bold uppercase text-[10px]">Cancelar</Button>
                        <Button 
                            onClick={handleUpdateProfessional}
                            disabled={loading}
                            className="flex-[2] h-12 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100"
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios del Profesional'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2.5rem] p-8 border-none shadow-2xl z-[150]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿Eliminar Profesional?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
                            <AlertCircle size={32} />
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                            Esta acción eliminará al profesional y sus configuraciones. Los turnos ya agendados permanecerán pero sin profesional asignado.
                        </p>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="rounded-xl h-12 font-bold uppercase text-[10px]">Cancelar</Button>
                            <Button 
                                onClick={handleDeleteProfessional} 
                                disabled={deleting} 
                                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-12 font-black uppercase text-[10px]"
                            >
                                {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
