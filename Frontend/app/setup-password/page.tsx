'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react'
import { API_URL } from '@/lib/api-config'

function SetupPasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const token = searchParams.get('token')
    const email = searchParams.get('email')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [success, setSuccess] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!token || !email) {
            toast.error("Link inválido o expirado")
            return
        }

        if (password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres")
            return
        }

        if (password !== confirmPassword) {
            toast.error("Las contraseñas no coinciden")
            return
        }

        setLoading(true)

        try {
            const response = await fetch(`${API_URL}/auth/setup-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, email, password })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || 'Error al establecer contraseña')
            }

            setSuccess(true)
            toast.success("¡Contraseña establecida correctamente!")

        } catch (error: any) {
            console.error(error)
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 p-4">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

                <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-green-500/30 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
                    <div className="text-center">
                        <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6 ring-1 ring-green-500/50">
                            <ShieldCheck className="h-8 w-8 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">¡Cuenta Activada!</h2>
                        <p className="text-zinc-400 mb-8">
                            Tu contraseña ha sido configurada exitosamente. Ya puedes ingresar al sistema.
                        </p>

                        <Button
                            className="w-full gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold"
                            size="lg"
                            onClick={() => router.push('/login')}
                        >
                            Ir al Login
                            <ArrowRight size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (!token || !email) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
                Link de invitación inválido. Verifica la URL.
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 p-4">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:shadow-primary/10">

                {/* Header */}
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/50">
                        <Lock className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Bienvenido</h1>
                    <p className="mt-2 text-sm text-zinc-400">
                        Configura tu acceso seguro para <br />
                        <span className="text-white font-medium">{email}</span>
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-zinc-300">Nueva Contraseña</Label>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10 border-white/10 bg-white/5 text-white placeholder:text-zinc-600 focus:border-primary focus:ring-primary/20"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-zinc-300">Confirmar Contraseña</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                className="pl-10 border-white/10 bg-white/5 text-white placeholder:text-zinc-600 focus:border-primary focus:ring-primary/20"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 mt-4"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            'Establecer Contraseña'
                        )}
                    </Button>

                    <p className="text-center text-xs text-zinc-500 mt-4">
                        Protegido por encriptación avanzada SSL/TLS.
                    </p>
                </form>
            </div>
        </div>
    )
}

export default function SetupPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
        }>
            <SetupPasswordForm />
        </Suspense>
    )
}
