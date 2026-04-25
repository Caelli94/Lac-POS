'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Landmark, CalendarDays, CheckCircle2, Hash, User, FileText, Banknote, Plus, Trash2, Layers } from 'lucide-react'
import { checkService } from '@/services/checkService'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface CheckItem {
    id: string;
    number: string;
    amount: string;
    dueDate: string;
}

interface CheckModalProps {
    isOpen: boolean;
    onClose: () => void;
    orgId: string;
    onSuccess: () => void;
    defaultType: 'own' | 'third_party';
    editingCheck?: any;
}

export function CheckModal({ isOpen, onClose, orgId, onSuccess, defaultType, editingCheck }: CheckModalProps) {
    const [type, setType] = useState<'own' | 'third_party'>(defaultType)
    const [number, setNumber] = useState('')
    const [bank, setBank] = useState('')
    const [amount, setAmount] = useState('')
    const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [cuit, setCuit] = useState('')
    const [entity, setEntity] = useState('')
    const [motive, setMotive] = useState('')
    const [status, setStatus] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    // Estado para registro múltiple
    const [isMultiple, setIsMultiple] = useState(false)
    const [extraChecks, setExtraChecks] = useState<CheckItem[]>([])

    useEffect(() => {
        if (editingCheck) {
            setType(editingCheck.type)
            setNumber(editingCheck.number)
            setBank(editingCheck.bank)
            setAmount(editingCheck.amount.toString())
            setIssueDate(format(new Date(editingCheck.issue_date), 'yyyy-MM-dd'))
            setDueDate(format(new Date(editingCheck.due_date), 'yyyy-MM-dd'))
            setCuit(editingCheck.cuit || '')
            setEntity(editingCheck.entity)
            setMotive(editingCheck.motive || '')
            setStatus(editingCheck.status)
            setNotes(editingCheck.notes || '')
            setIsMultiple(false)
            setExtraChecks([])
        } else {
            resetForm()
            setType(defaultType)
            setStatus(defaultType === 'own' ? 'Pendiente' : 'Recibido')
        }
    }, [editingCheck, defaultType, isOpen])

    const resetForm = () => {
        setNumber('')
        setBank('')
        setAmount('')
        setIssueDate(format(new Date(), 'yyyy-MM-dd'))
        setDueDate(format(new Date(), 'yyyy-MM-dd'))
        setCuit('')
        setEntity('')
        setMotive('')
        setNotes('')
        setIsMultiple(false)
        setExtraChecks([])
    }

    const addExtraCheck = () => {
        setExtraChecks([...extraChecks, {
            id: Math.random().toString(36).substr(2, 9),
            number: '',
            amount: amount,
            dueDate: dueDate
        }])
    }

    const removeExtraCheck = (id: string) => {
        setExtraChecks(extraChecks.filter(c => c.id !== id))
    }

    const updateExtraCheck = (id: string, field: keyof CheckItem, value: string) => {
        setExtraChecks(extraChecks.map(c => c.id === id ? { ...c, [field]: value } : c))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!number || !bank || !amount || !entity) {
            return toast.error("Por favor complete los campos obligatorios")
        }

        setLoading(true)
        try {
            if (editingCheck) {
                // Modo Edición
                await checkService.update(editingCheck._id, {
                    type, number, bank, amount: Number(amount),
                    issue_date: new Date(issueDate), due_date: new Date(dueDate),
                    cuit, entity, motive, status, notes
                })
                toast.success("Cheque actualizado correctamente")
            } else {
                // Modo Creación (Posiblemente Múltiple)
                const mainCheck = {
                    organization: orgId, type, number, bank, amount: Number(amount),
                    issue_date: new Date(issueDate), due_date: new Date(dueDate),
                    cuit, entity, motive, status, notes
                }

                const checksToCreate = [mainCheck]

                if (isMultiple) {
                    extraChecks.forEach(extra => {
                        checksToCreate.push({
                            ...mainCheck,
                            number: extra.number || (Number(number) + (checksToCreate.length)).toString(), // Auto-incremental simple si no hay número
                            amount: Number(extra.amount),
                            due_date: new Date(extra.dueDate)
                        })
                    })
                }

                // Ejecutamos las creaciones (en lote secuencial para evitar race conditions pesados o fallos parciales sin feedback)
                for (const checkData of checksToCreate) {
                    await checkService.create(checkData)
                }
                toast.success(checksToCreate.length > 1 ? `${checksToCreate.length} cheques registrados` : "Cheque registrado correctamente")
            }

            onSuccess()
            onClose()
        } catch (error) {
            toast.error("Error al procesar la solicitud")
        } finally {
            setLoading(false)
        }
    }

    const ownStatuses = ['Pendiente', 'Entregado', 'Pagado', 'Anulado'];
    const thirdPartyStatuses = ['Recibido', 'Depositado', 'Entregado', 'Por Cobrar', 'Cobrado'];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-3xl bg-white rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">
                        {editingCheck ? 'Editar Cheque' : 'Registrar Nuevo Cheque'}
                    </DialogTitle>
                    {!editingCheck && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                            <Layers size={14} className={isMultiple ? "text-blue-600" : "text-slate-400"} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">¿Varios Cheques?</span>
                            <input
                                type="checkbox"
                                checked={isMultiple}
                                onChange={(e) => setIsMultiple(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                        </div>
                    )}
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar min-h-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Selector de Tipo (Solo en creación) */}
                        {!editingCheck && (
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Cheque</Label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => { setType('own'); setStatus('Pendiente'); }}
                                        className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${type === 'own' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Propio
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setType('third_party'); setStatus('Recibido'); }}
                                        className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${type === 'third_party' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Terceros
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Banco y Número Base */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Banco</Label>
                            <div className="relative">
                                <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                                <Input
                                    placeholder="Nombre del banco"
                                    className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950/10 font-bold"
                                    value={bank}
                                    onChange={(e) => setBank(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número de {isMultiple ? 'Primer Cheque' : 'Cheque'}</Label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                                <Input
                                    placeholder="00000000"
                                    className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950/10 font-bold"
                                    value={number}
                                    onChange={(e) => setNumber(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Importe y CUIT */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monto {isMultiple ? 'Cheque #1' : ''}</Label>
                            <div className="relative">
                                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    className="pl-12 h-12 bg-emerald-50/50 border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-950/10 font-black text-emerald-700"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CUIT (Opcional)</Label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                                <Input
                                    placeholder="00-00000000-0"
                                    className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950/10 font-bold"
                                    value={cuit}
                                    onChange={(e) => setCuit(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Entidad (Emisor o Destinatario) */}
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {type === 'own' ? 'Entregado a / Destinatario' : 'Recibido de / Emisor'}
                            </Label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                                <Input
                                    placeholder={type === 'own' ? 'Ej: Proveedor S.A.' : 'Ej: Juan Pérez'}
                                    className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950/10 font-bold"
                                    value={entity}
                                    onChange={(e) => setEntity(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Fechas Base */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha de Emisión</Label>
                            <div className="relative">
                                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                                <Input
                                    type="date"
                                    className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950/10 font-bold"
                                    value={issueDate}
                                    onChange={(e) => setIssueDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vencimiento {isMultiple ? '#1' : ''}</Label>
                            <div className="relative">
                                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                                <Input
                                    type="date"
                                    className="pl-12 h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950/10 font-bold"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* SECCIÓN MÚLTIPLE */}
                        {isMultiple && (
                            <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Cheques Adicionales</h3>
                                    <Button
                                        type="button"
                                        onClick={addExtraCheck}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 rounded-lg border-blue-100 text-blue-600 hover:bg-blue-50 font-black text-[9px] uppercase tracking-widest px-4"
                                    >
                                        <Plus size={14} className="mr-1" /> Añadir Cheque
                                    </Button>
                                </div>

                                {extraChecks.map((item, index) => (
                                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-7 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 items-end animate-in slide-in-from-right-2 duration-300">
                                        <div className="md:col-span-2 space-y-2">
                                            <Label className="text-[8px] font-black uppercase text-slate-400">Núm. Cheque #{index + 2}</Label>
                                            <Input
                                                className="h-10 rounded-lg bg-white"
                                                placeholder="Auto-inc"
                                                value={item.number}
                                                onChange={(e) => updateExtraCheck(item.id, 'number', e.target.value)}
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <Label className="text-[8px] font-black uppercase text-slate-400">Importe</Label>
                                            <Input
                                                type="number"
                                                className="h-10 rounded-lg bg-white font-bold text-emerald-600"
                                                value={item.amount}
                                                onChange={(e) => updateExtraCheck(item.id, 'amount', e.target.value)}
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <Label className="text-[8px] font-black uppercase text-slate-400">Vencimiento</Label>
                                            <Input
                                                type="date"
                                                className="h-10 rounded-lg bg-white"
                                                value={item.dueDate}
                                                onChange={(e) => updateExtraCheck(item.id, 'dueDate', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex justify-end p-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeExtraCheck(item.id)}
                                                className="text-slate-300 hover:text-rose-500 h-10 w-10"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Motivo y Estado */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motivo / Concepto</Label>
                            <Input
                                placeholder="Ej: Pago Factura #123"
                                className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950/10 font-medium"
                                value={motive}
                                onChange={(e) => setMotive(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado Actual</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950/10 font-bold">
                                    <SelectValue placeholder="Seleccione un estado" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                    {(type === 'own' ? ownStatuses : thirdPartyStatuses).map((s) => (
                                        <SelectItem key={s} value={s} className="font-bold text-xs uppercase tracking-tight py-3">
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notas Adicionales</Label>
                            <Textarea
                                placeholder="Cualquier aclaración extra..."
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
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Plus className="animate-spin" size={16} /> Procesando...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <CheckCircle2 size={16} /> {editingCheck ? 'Guardar Cambios' : (isMultiple ? `Confirmar ${extraChecks.length + 1} Cheques` : 'Confirmar Registro')}
                                </span>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
