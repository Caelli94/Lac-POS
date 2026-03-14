'use client'

import { useState } from 'react'
import { createCompanyAction } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, Save, Copy, CheckCircle, ShieldCheck } from 'lucide-react'

export default function NewCompanyPage() {
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [email, setEmail] = useState('')

    // Success State
    const [setupLink, setSetupLink] = useState<string | null>(null)

    const [slugError, setSlugError] = useState('')

    // Generador automático de Slug (solo al escribir nombre)
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setName(val)
        // Convierte "Mi Empresa S.A." -> "mi-empresa-sa"
        // Solo si el usuario no ha tocado el slug manualmente aún
        if (!slug) {
            const generatedSlug = val
                .toLowerCase()
                .trim()
                .replace(/[\s\W-]+/g, '-')
            setSlug(generatedSlug)
        }
    }

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setSlug(val)

        // Validación en tiempo real
        if (/\s/.test(val)) {
            setSlugError('No se permiten espacios en la URL. Use guiones (-).')
        } else if (/[^a-z0-9-]/.test(val)) {
            setSlugError('Carácter no permitido. Solo letras minúsculas, números y guiones.')
        } else {
            setSlugError('')
        }
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setSlugError('') // Clear previous errors

        // Validación Cliente antes de enviar
        if (/\s/.test(slug) || /[^a-z0-9-]/.test(slug)) {
            setSlugError('Corrija la URL antes de continuar. No se permiten espacios ni caracteres especiales.')
            toast.error("Formato de URL inválido")
            setLoading(false)
            return
        }

        const result = await createCompanyAction(formData)

        if (result?.error) {
            toast.error(result.error)
            setLoading(false)
        } else {
            console.log("Success result in client:", result)
            if (result?.setupLink) {
                setSetupLink(result.setupLink)
                toast.success("Empresa y Link de Acceso generados exitosamente")
            } else {
                toast.success("Empresa creada exitosamente")
                // Fallback redirect handled by action if no link (legacy path)
                window.location.href = '/admin/companies'
            }
            setLoading(false)
        }
    }

    const copyToClipboard = () => {
        if (setupLink) {
            navigator.clipboard.writeText(setupLink)
            toast.success("Link copiado al portapapeles")
        }
    }

    if (setupLink) {
        return (
            <div className="p-8 min-h-screen bg-slate-50 flex justify-center items-center">
                <Card className="w-full max-w-lg shadow-xl border-green-200">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                            <ShieldCheck size={32} />
                        </div>
                        <CardTitle className="text-2xl text-green-700">¡Empresa Creada con Éxito!</CardTitle>
                        <CardDescription>
                            La organización <strong>{name}</strong> ha sido registrada.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                            <p className="font-bold mb-1">⚠️ Acción Requerida</p>
                            Comparte este link con el cliente. Es un enlace seguro de un solo uso para que configure su contraseña de administrador.
                        </div>

                        <div className="space-y-2">
                            <Label>Link de Invitación Seguro</Label>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={setupLink}
                                    className="font-mono text-xs bg-slate-50"
                                />
                                <Button onClick={copyToClipboard} variant="outline" className="shrink-0 gap-2">
                                    <Copy size={14} />
                                    Copiar
                                </Button>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-center">
                            <Link href="/admin/companies">
                                <Button className="w-full">
                                    Volver al Listado de Empresas
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-8 min-h-screen bg-slate-50 flex justify-center items-start pt-20">
            <Card className="w-full max-w-lg shadow-md">
                <CardHeader>
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/admin/companies">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft size={18} />
                            </Button>
                        </Link>
                        <CardTitle>Nueva Empresa</CardTitle>
                    </div>
                    <CardDescription>
                        Registra una nueva organización y genera un acceso para el admin.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-6">

                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre de la Organización</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Ej: Ferretería Central"
                                value={name}
                                onChange={handleNameChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Identificador URL (Slug)</Label>
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-slate-400 bg-slate-100 px-2 py-2 rounded">
                                    miapp.com/
                                </span>
                                <Input
                                    id="slug"
                                    name="slug"
                                    value={slug}
                                    onChange={handleSlugChange}
                                    className={`font-mono text-sm ${slugError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    required
                                />
                            </div>
                            {slugError && (
                                <p className="text-xs text-red-500 font-medium animate-pulse">
                                    {slugError}
                                </p>
                            )}
                            <p className="text-xs text-slate-500">
                                Se usará para la dirección web. Solo letras minúsculas y guiones.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="adminEmail">Email del Administrador</Label>
                            <Input
                                id="adminEmail"
                                name="adminEmail"
                                type="email"
                                placeholder="admin@cliente.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <p className="text-xs text-slate-500">
                                Se enviará una invitación a este correo (o se generará un link manual).
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Link href="/admin/companies">
                                <Button variant="outline" type="button">Cancelar</Button>
                            </Link>
                            <Button type="submit" disabled={loading} className="gap-2">
                                <Save size={16} />
                                {loading ? 'Creando...' : 'Guardar y Generar Acceso'}
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    )
}