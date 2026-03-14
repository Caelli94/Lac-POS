'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { organizationService } from '@/services/organizationService'
import { useRouter } from 'next/navigation'

interface DeleteCompanyDialogProps {
    organization: {
        _id: string;
        name: string;
        slug: string;
    };
    trigger?: React.ReactNode;
}

export function DeleteCompanyDialog({ organization, trigger }: DeleteCompanyDialogProps) {
    const [open, setOpen] = useState(false)
    const [confirmSlug, setConfirmSlug] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const isSlugMatch = confirmSlug === organization.slug

    const handleDelete = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!isSlugMatch) return
        if (!password) {
            toast.error("Ingrese su contraseña")
            return
        }

        setLoading(true)
        // Toast persistente para feedback visual durante el backup
        const loadingToast = toast.loading("Iniciando protocolo de eliminación segura...")

        try {
            toast.message("Creando respaldo de seguridad...", { id: loadingToast })

            const res = await organizationService.delete(organization._id, password)

            if (res.error) {
                toast.error(res.error, { id: loadingToast })
            } else {
                toast.success("Empresa eliminada correctamente. Respaldo guardado.", { id: loadingToast })
                setOpen(false)
                router.refresh()
            }
        } catch (error) {
            toast.error("Error inesperado en la eliminación", { id: loadingToast })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="destructive" size="sm" className="gap-2">
                        <Trash2 size={16} />
                        Eliminar
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-red-200">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-2 text-red-600">
                        <AlertTriangle size={24} />
                    </div>
                    <DialogTitle className="text-center text-red-600">Eliminar Organización</DialogTitle>
                    <DialogDescription className="text-center">
                        Esta acción es <strong>IRREVERSIBLE</strong>. Se eliminarán permanentemente todos los datos de <strong>{organization.name}</strong>.
                        <br /><br />
                        <span className="block text-xs text-slate-500 bg-slate-100 p-2 rounded">
                            Protocolo de Seguridad: Se generará automáticamente un backup completo antes de la eliminación.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleDelete} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>1. Confirme el identificador</Label>
                        <div className="text-xs text-slate-500 mb-1">
                            Escriba <span className="font-mono font-bold select-all">{organization.slug}</span> abajo:
                        </div>
                        <Input
                            value={confirmSlug}
                            onChange={(e) => setConfirmSlug(e.target.value)}
                            placeholder={organization.slug}
                            className={!isSlugMatch && confirmSlug ? "border-red-300 bg-red-50" : ""}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>2. Su Contraseña de Super Admin</Label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>

                    <DialogFooter className="sm:justify-between gap-2 mt-4">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={!isSlugMatch || !password || loading}
                            className="w-full sm:w-auto"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                "Eliminar Definitivamente"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
