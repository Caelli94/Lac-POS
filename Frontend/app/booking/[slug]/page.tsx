'use client'

import React, { useState, useEffect } from 'react'
import { publicBookingService } from '@/services/publicBookingService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { format, addDays, startOfDay, isBefore, parseISO, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarDays, Clock, CheckCircle2, User, Briefcase, ChevronRight, ChevronLeft, Calendar as CalendarIcon, MapPin, Phone, Globe, X, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const [org, setOrg] = useState<any>(null);
    const [professionals, setProfessionals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1); // 1: Prof, 2: Date/Time, 3: Contact, 4: Success
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    // Booking State
    const [selectedProfessional, setSelectedProfessional] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [service, setService] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const orgRes = await publicBookingService.getOrgDetails(slug);
            if (orgRes.success) {
                setOrg(orgRes.data);
                const profRes = await publicBookingService.getProfessionals(orgRes.data.id);
                if (profRes.success) setProfessionals(profRes.data);
            } else {
                toast.error("Este comercio no existe o no tiene habilitadas las reservas online.");
            }
            setLoading(false);
        };
        fetchData();
    }, [slug]);

    const handleBook = async () => {
        if (!name || !phone || !service) return toast.error("Por favor completa los datos de contacto y el servicio.");
        
        setLoading(true);
        const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
        const duration = org.settings?.appointments?.default_duration || 30;
        const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

        const res = await publicBookingService.book({
            organization_id: org.id,
            guest_name: name,
            guest_phone: phone,
            date: startDateTime,
            end_date: endDateTime,
            service_description: service,
            professional_id: selectedProfessional?._id,
            notes
        });

        if (res.success) {
            setStep(4);
        } else {
            toast.error(res.message || "Error al procesar la reserva.");
        }
        setLoading(false);
    };

    const getAvailableSlots = () => {
        if (!selectedDate) return [];
        const dateObj = new Date(selectedDate + 'T00:00:00');
        const dayName = format(dateObj, 'eeee', { locale: es }).charAt(0).toUpperCase() + format(dateObj, 'eeee', { locale: es }).slice(1);
        
        const workingHours = selectedProfessional 
            ? selectedProfessional.working_hours 
            : org.settings?.appointments?.working_hours;

        const dayConfig = workingHours?.find((h: any) => h.day === dayName);
        
        if (!dayConfig || !dayConfig.enabled) return [];

        const slots: string[] = [];
        const duration = org.settings?.appointments?.default_duration || 30;

        const ranges = dayConfig.slots && dayConfig.slots.length > 0 
            ? dayConfig.slots 
            : [{ start: dayConfig.start || '09:00', end: dayConfig.end || '18:00' }];

        ranges.forEach((range: any) => {
            let current = range.start;
            const end = range.end;

            while (current < end) {
                slots.push(current);
                const [h, m] = current.split(':').map(Number);
                let nextM = m + duration;
                let nextH = h + Math.floor(nextM / 60);
                nextM = nextM % 60;
                if (nextH >= 24) break;
                current = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
                if (current >= end) break;
            }
        });

        return slots;
    };

    const renderCalendar = () => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });
        const startDay = start.getDay(); // 0: Sun, 1: Mon...
        const maxDays = org?.settings?.appointments?.max_booking_days || 30;
        const maxDate = addDays(new Date(), maxDays);

        return (
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
                        <ChevronLeft size={18} />
                    </Button>
                    <span className="font-black uppercase text-xs tracking-widest">
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight size={18} />
                    </Button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
                        <div key={d} className="text-[10px] font-black text-slate-300 py-2">{d}</div>
                    ))}
                    {Array.from({ length: startDay }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {days.map(day => {
                        const isPast = isBefore(day, startOfDay(new Date()));
                        const isTooFar = isBefore(maxDate, day);
                        const isDisabled = isPast || isTooFar;
                        const isSelected = isSameDay(day, new Date(selectedDate + 'T00:00:00'));

                        return (
                            <button
                                key={day.toString()}
                                disabled={isDisabled}
                                onClick={() => {
                                    setSelectedDate(format(day, 'yyyy-MM-dd'));
                                    setSelectedTime('');
                                    setIsCalendarOpen(false);
                                }}
                                className={`
                                    h-10 w-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center
                                    ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110' : ''}
                                    ${!isSelected && !isDisabled ? 'hover:bg-indigo-50 text-slate-700' : ''}
                                    ${isDisabled ? 'text-slate-200 cursor-not-allowed' : ''}
                                    ${isToday(day) && !isSelected ? 'border-2 border-indigo-100 text-indigo-600' : ''}
                                `}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (loading && !org) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (!org) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-4xl font-black text-slate-900 mb-4">404</h1>
            <p className="text-slate-500 font-medium max-w-xs">Lo sentimos, este link de reserva no es válido o el comercio lo ha desactivado.</p>
        </div>
    );

    // Pantalla de "Reservas Pausadas" si el dueño desactivó la landing
    if (!org.settings?.appointments?.self_booking_enabled) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl shadow-indigo-900/10 border border-slate-100 p-12 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                    <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <CalendarIcon size={48} className="opacity-50" />
                        <X size={24} className="absolute mt-12 ml-12 bg-white rounded-full p-1 border-4 border-white text-rose-500" />
                    </div>
                    
                    <div className="space-y-4">
                        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Reservas Pausadas</h1>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">
                            {org.name} no está aceptando reservas online en este momento. Por favor, intenta más tarde o contáctanos directamente.
                        </p>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Canales de contacto</p>
                        <div className="flex justify-center gap-6 text-indigo-600">
                            {org.phone && (
                                <a href={`tel:${org.phone}`} className="flex flex-col items-center gap-2 hover:scale-110 transition-transform">
                                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200"><Phone size={20} /></div>
                                    <span className="text-[10px] font-bold uppercase">Llamar</span>
                                </a>
                            )}
                            <a 
                                href={`https://wa.me/549${(org.settings?.appointments?.whatsapp_number || org.phone)?.replace(/[^0-9]/g, '')}`} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 hover:scale-110 transition-transform"
                            >
                                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200"><MessageSquare size={20} /></div>
                                <span className="text-[10px] font-bold uppercase">WhatsApp</span>
                            </a>
                        </div>
                    </div>

                    <div className="pt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Powered by LAC POS</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
            {/* BACKGROUND DECORATION */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="absolute top-1/2 -left-24 w-72 h-72 bg-emerald-500/10 blur-[100px] rounded-full" />
            </div>

            <main className="max-w-xl mx-auto px-6 py-12 space-y-8">
                {/* HEADER */}
                <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
                    {org.logo ? (
                        <img src={org.logo} alt={org.name} className="w-20 h-20 rounded-[2rem] mx-auto shadow-xl object-cover border-4 border-white" />
                    ) : (
                        <div className="w-20 h-20 rounded-[2rem] bg-indigo-600 mx-auto shadow-xl flex items-center justify-center text-white text-3xl font-black">
                            {org.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-black tracking-tight uppercase">{org.name}</h1>
                        <p className="text-sm font-medium text-slate-500">Reserva tu turno de forma rápida y sencilla.</p>
                    </div>
                </div>

                {/* PROGRESS BAR */}
                {step < 4 && (
                    <div className="flex items-center gap-2 px-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-200'}`} />
                        ))}
                    </div>
                )}

                {/* STEPS */}
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-900/5 border border-slate-100 overflow-hidden min-h-[400px] flex flex-col">
                    {step === 1 && (
                        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1">
                            <div className="space-y-2">
                                <h2 className="text-xl font-black uppercase tracking-tight">¿Con quién quieres agendar?</h2>
                                <p className="text-xs font-medium text-slate-400">Selecciona un profesional o elige cualquiera disponible.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-4">
                                <button 
                                    onClick={() => { setSelectedProfessional(null); setStep(2); }}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${!selectedProfessional ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                                        <Globe size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-black text-sm uppercase">Cualquiera disponible</p>
                                        <p className="text-[10px] font-medium text-slate-500">Asignaremos al profesional libre más cercano.</p>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300" />
                                </button>

                                {professionals.map(p => (
                                    <button 
                                        key={p._id}
                                        onClick={() => { setSelectedProfessional(p); setStep(2); }}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${selectedProfessional?._id === p._id ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: p.color }}>
                                            <User size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-sm uppercase">{p.name}</p>
                                            <p className="text-[10px] font-medium text-slate-500 uppercase">{p.specialty}</p>
                                        </div>
                                        <ChevronRight size={18} className="text-slate-300" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
                            <div className="flex items-center justify-between">
                                <button onClick={() => setStep(1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="text-center">
                                    <h2 className="text-sm font-black uppercase tracking-widest text-indigo-600">Fecha y Hora</h2>
                                </div>
                                <div className="w-9" />
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selecciona el día</Label>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setIsCalendarOpen(true)}
                                            className="h-7 px-2 text-indigo-600 text-[10px] font-black uppercase"
                                        >
                                            <CalendarIcon size={14} className="mr-1" /> Ver Calendario
                                        </Button>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                        {[0, 1, 2, 3, 4, 5, 6].map(offset => {
                                            const d = addDays(new Date(), offset);
                                            const isSelected = selectedDate === format(d, 'yyyy-MM-dd');
                                            return (
                                                <button 
                                                    key={offset}
                                                    onClick={() => { setSelectedDate(format(d, 'yyyy-MM-dd')); setSelectedTime(''); }}
                                                    className={`flex flex-col items-center justify-center min-w-[70px] h-20 rounded-2xl border-2 transition-all ${isSelected ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                                                >
                                                    <span className="text-[10px] font-black uppercase opacity-60">{format(d, 'EEE', { locale: es })}</span>
                                                    <span className="text-lg font-black">{format(d, 'd')}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Horarios Disponibles</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {getAvailableSlots().length > 0 ? getAvailableSlots().map(t => (
                                            <button 
                                                key={t}
                                                onClick={() => setSelectedTime(t)}
                                                className={`h-11 rounded-xl border-2 font-bold text-xs transition-all ${selectedTime === t ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : 'border-slate-100 bg-white hover:border-indigo-200 text-slate-600'}`}
                                            >
                                                {t}
                                            </button>
                                        )) : (
                                            <div className="col-span-3 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                <p className="text-xs font-medium text-slate-400">No hay horarios disponibles para este día.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Button 
                                disabled={!selectedTime}
                                onClick={() => setStep(3)}
                                className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100"
                            >
                                Siguiente Paso <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
                            <div className="flex items-center justify-between">
                                <button onClick={() => setStep(2)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="text-center">
                                    <h2 className="text-sm font-black uppercase tracking-widest text-indigo-600">Tus Datos</h2>
                                </div>
                                <div className="w-9" />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">¿Qué servicio necesitas?</Label>
                                    <Input 
                                        placeholder="Ej: Corte y Barba, Consulta..." 
                                        value={service}
                                        onChange={(e) => setService(e.target.value)}
                                        className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Nombre Completo</Label>
                                    <Input 
                                        placeholder="Tu nombre aquí..." 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Teléfono (WhatsApp)</Label>
                                    <Input 
                                        placeholder="Ej: 1122334455" 
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase">Notas (Opcional)</Label>
                                    <Textarea 
                                        placeholder="Algún detalle que debamos saber..." 
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="rounded-xl bg-slate-50 border-slate-200 min-h-[80px]"
                                    />
                                </div>
                            </div>

                            <Button 
                                disabled={loading || !name || !phone || !service}
                                onClick={handleBook}
                                className="w-full h-14 bg-black text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-200"
                            >
                                {loading ? 'Procesando...' : 'Confirmar Reserva'}
                            </Button>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="p-12 text-center space-y-6 animate-in zoom-in-95 duration-500 flex-1 flex flex-col items-center justify-center">
                            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-100">
                                <CheckCircle2 size={48} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tight">¡Reserva Exitosa!</h2>
                                <p className="text-sm font-medium text-slate-500">
                                    Tu turno ha sido agendado. Te enviaremos un recordatorio por WhatsApp cuando se acerque la fecha.
                                </p>
                            </div>
                            <div className="w-full p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-3">
                                <div className="flex justify-between text-xs">
                                    <span className="font-bold text-slate-400 uppercase">Fecha</span>
                                    <span className="font-black text-slate-900">{format(new Date(selectedDate + 'T00:00:00'), "EEEE d 'de' MMMM", { locale: es })}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="font-bold text-slate-400 uppercase">Hora</span>
                                    <span className="font-black text-slate-900">{selectedTime} hs</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="font-bold text-slate-400 uppercase">Profesional</span>
                                    <span className="font-black text-slate-900">{selectedProfessional?.name || 'Cualquiera'}</span>
                                </div>
                            </div>
                            <Button 
                                onClick={() => window.location.reload()}
                                variant="outline"
                                className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest"
                            >
                                Reservar otro turno
                            </Button>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="text-center space-y-2 pb-12">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Powered by LAC POS</p>
                    <div className="flex items-center justify-center gap-4 text-slate-400">
                        <Phone size={14} />
                        <MapPin size={14} />
                        <Globe size={14} />
                    </div>
                </div>
            </main>

            {/* CALENDAR MODAL */}
            <Dialog open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none rounded-[2.5rem]">
                    <div className="bg-white">
                        <DialogHeader className="p-8 pb-0">
                            <DialogTitle className="text-sm font-black uppercase tracking-widest text-center">Seleccionar Fecha</DialogTitle>
                        </DialogHeader>
                        {renderCalendar()}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
