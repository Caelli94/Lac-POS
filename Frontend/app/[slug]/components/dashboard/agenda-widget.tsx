
'use client'

import React, { useState, useEffect } from 'react'
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Trash2, CalendarDays, CheckCircle2, Calendar as CalendarIcon, Pencil } from 'lucide-react'
import { taskService } from '@/services/taskService'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Task {
    _id: string;
    title: string;
    description?: string;
    date: string; // ISO string
    isCompleted: boolean;
}

export function AgendaWidget({ orgId }: { orgId: string }) {
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [tasks, setTasks] = useState<Task[]>([])

    // Modal State
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [newTaskDesc, setNewTaskDesc] = useState('')
    const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(new Date())
    const [editingTask, setEditingTask] = useState<Task | null>(null)
    const [creating, setCreating] = useState(false)

    // Delete Alert State
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
    const [taskToDelete, setTaskToDelete] = useState<string | null>(null)

    // Fetch tasks
    const fetchTasks = async () => {
        const data = await taskService.getTasks(orgId);
        setTasks(data);
    }

    useEffect(() => {
        if (orgId) fetchTasks();
    }, [orgId])

    // Filter tasks for selected date
    const selectedDateTasks = tasks.filter(task =>
        date && new Date(task.date).toDateString() === date.toDateString()
    ).sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted));

    // Dates that have tasks (for indicators)
    const datesWithTasks = tasks.filter(t => !t.isCompleted).map(t => new Date(t.date));

    const openCreateDialog = () => {
        setEditingTask(null);
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskDate(date || new Date());
        setIsDialogOpen(true);
    }

    const openEditDialog = (task: Task, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTask(task);
        setNewTaskTitle(task.title);
        setNewTaskDesc(task.description || '');
        setNewTaskDate(new Date(task.date));
        setIsDialogOpen(true);
    }

    const handleSaveTask = async () => {
        if (!newTaskTitle || !newTaskDate) return;
        setCreating(true);
        try {
            if (editingTask) {
                // Update
                await taskService.updateTask(editingTask._id, {
                    title: newTaskTitle,
                    description: newTaskDesc,
                    date: newTaskDate,
                });
                toast.success('Tarea actualizada');
            } else {
                // Create
                await taskService.createTask({
                    title: newTaskTitle,
                    description: newTaskDesc,
                    date: newTaskDate,
                    organization: orgId
                });
                toast.success('Tarea agregada');
            }

            setIsDialogOpen(false);
            fetchTasks();
        } catch (error) {
            toast.error('Error al guardar tarea');
        } finally {
            setCreating(false);
        }
    }

    const toggleTask = async (task: Task) => {
        const updatedTasks = tasks.map(t => t._id === task._id ? { ...t, isCompleted: !t.isCompleted } : t);
        setTasks(updatedTasks);

        try {
            await taskService.updateTask(task._id, { isCompleted: !task.isCompleted });
        } catch (error) {
            toast.error('Error de conexión');
            fetchTasks();
        }
    }

    const confirmDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTaskToDelete(id);
        setIsDeleteAlertOpen(true);
    }

    const handleDelete = async () => {
        if (!taskToDelete) return;
        try {
            await taskService.deleteTask(taskToDelete);
            setTasks(tasks.filter(t => t._id !== taskToDelete));
            toast.success('Tarea eliminada');
        } catch (error) {
            toast.error('Error al eliminar');
        } finally {
            setIsDeleteAlertOpen(false);
            setTaskToDelete(null);
        }
    }

    return (
        <Card className="shadow-sm border-slate-200 overflow-hidden h-full w-full">
            <CardHeader className="bg-slate-50/50 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <CalendarDays className="text-indigo-600" size={24} />
                            Agenda
                        </CardTitle>
                        <CardDescription>
                            Organiza tus compromisos y recordatorios
                        </CardDescription>
                    </div>
                    <Button
                        onClick={openCreateDialog}
                        className="bg-slate-900 hover:bg-black text-white font-black uppercase text-xs px-6 h-10 tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200"
                    >
                        <Plus size={16} className="mr-2" />
                        NUEVA TAREA
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row h-[420px]">
                    {/* Calendar Section */}
                    <div className="p-4 border-r border-slate-100 flex justify-center items-start bg-white">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={es}
                            className="rounded-md"
                            modifiers={{
                                hasTask: datesWithTasks
                            }}
                            modifiersStyles={{
                                hasTask: {
                                    fontWeight: 'bold',
                                    textDecoration: 'underline',
                                    color: 'var(--primary)'
                                }
                            }}
                        />
                    </div>

                    {/* Task List Section */}
                    <div className="flex-1 bg-slate-50/30 flex flex-col min-w-0">
                        <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                            <h3 className="font-bold text-slate-700 capitalize">
                                {date ? format(date, "EEEE, d 'de' MMMM", { locale: es }) : 'Selecciona una fecha'}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                                {selectedDateTasks.length === 0 ? 'Sin tareas pendientes' : `${selectedDateTasks.length} tarea(s)`}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {selectedDateTasks.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                        <CalendarDays size={32} />
                                    </div>
                                    <p className="text-sm font-medium">No hay tareas para este día</p>
                                </div>
                            ) : (
                                selectedDateTasks.map(task => (
                                    <div
                                        key={task._id}
                                        className={cn(
                                            "group bg-white p-4 rounded-xl border border-slate-100 shadow-sm transition-all hover:shadow-md flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2",
                                            task.isCompleted && "opacity-60 bg-slate-50 border-transparent shadow-none"
                                        )}
                                    >
                                        <button
                                            onClick={() => toggleTask(task)}
                                            className={cn(
                                                "mt-1 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                                task.isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-indigo-500 text-transparent"
                                            )}
                                        >
                                            <CheckCircle2 size={12} fill="currentColor" />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <h4 className={cn("font-bold text-sm text-slate-800 truncate", task.isCompleted && "line-through text-slate-500")}>
                                                {task.title}
                                            </h4>
                                            {task.description && (
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => openEditDialog(task, e)}
                                                className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-lg"
                                            >
                                                <Pencil size={14} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => confirmDelete(task._id, e)}
                                                className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-lg"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-[425px] rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white z-[100]">
                    <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100 shrink-0">
                        <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                            {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Título de la Tarea</label>
                            <Input
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Ej: Pagar a Proveedor..."
                                className="h-12 px-4 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-900"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2 flex flex-col">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Fecha Programada</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "h-12 px-4 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-200 text-left font-bold transition-all",
                                            !newTaskDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-indigo-600" />
                                        {newTaskDate ? format(newTaskDate, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-[1.5rem] overflow-hidden" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={newTaskDate}
                                        onSelect={setNewTaskDate}
                                        locale={es}
                                        className="rounded-[1.5rem] border border-slate-100 bg-white"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Descripción (Opcional)</label>
                            <Textarea
                                value={newTaskDesc}
                                onChange={(e) => setNewTaskDesc(e.target.value)}
                                placeholder="Detalles adicionales o notas importantes..."
                                className="min-h-[120px] px-4 py-3 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none font-medium text-slate-600"
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setIsDialogOpen(false)}
                            className="h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest text-slate-500 hover:bg-white hover:text-slate-900 transition-all flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveTask}
                            disabled={!newTaskTitle || !newTaskDate || creating}
                            className="h-12 bg-slate-900 hover:bg-black text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-slate-200 transition-all active:scale-95 flex-1"
                        >
                            {creating ? 'Guardando...' : editingTask ? 'Actualizar' : 'Guardar Tarea'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog (Styled) */}
            <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <DialogContent className="max-w-[400px] bg-white rounded-[2rem] p-8 border-none shadow-2xl z-[100]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-center">¿ELIMINAR TAREA?</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                            <Trash2 size={32} />
                        </div>
                        <p className="text-sm text-slate-500">
                            Esta acción no se puede deshacer. La tarea se eliminará permanentemente.
                        </p>
                        <div className="w-full grid grid-cols-2 gap-3 mt-4">
                            <Button variant="outline" onClick={() => setIsDeleteAlertOpen(false)} className="rounded-xl h-12 font-bold uppercase text-[10px]">Cancelar</Button>
                            <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-12 font-black uppercase text-[10px]">
                                Sí, Eliminar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
