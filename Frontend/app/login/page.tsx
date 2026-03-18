
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { TwoFactorForm } from './TwoFactorForm';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 2FA State
    const [require2FA, setRequire2FA] = useState(false);
    const [tempToken, setTempToken] = useState('');

    useEffect(() => {
        // Auto-logout for expired sessions to destroy orphan cookies
        if (typeof window !== 'undefined' && window.location.search.includes('expired=true')) {
            authService.logout().then(() => {
                toast.error("Sesión Expirada", { description: "Su sesión fue iniciada en otro dispositivo o ha caducado. Por favor, vuelva a ingresar." });
                router.replace('/login');
            });
        }
    }, [router]);

    const processLoginSuccess = (response: any) => {
        // Session Warning (Single Session Enforcement)
        if (response.terminatedSession) {
            const { ip, device } = response.terminatedSession;
            toast.warning(`Aviso de Seguridad: Sesión Previa Cerrada`, {
                description: `Hemos cerrado tu sesión abierta en: ${device} (IP: ${ip}).`,
                duration: 10000,
                style: { border: '1px solid #f59e0b', background: 'rgba(245, 158, 11, 0.1)' }
            });
        }

        toast.success(`Bienvenido, ${response.name}`);

        // 1. Check for Global Admin (SUPERADMIN ONLY)
        if (response.role === 'superadmin') {
            router.push('/admin/dashboard');
            return;
        }

        // 2. Smart Redirect based on Organization
        const orgSlug = response.organization?.slug;
        if (orgSlug) {
            router.push(`/${orgSlug}`);
        } else {
            toast.warning('Cuenta sin organización asignada. Contacte soporte.');
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Por favor complete todos los campos');
            return;
        }

        setIsLoading(true);

        try {
            const response = await authService.login({ email, password, remember: rememberMe });

            if (response.require2fa) {
                setTempToken(response.tempToken);
                setRequire2FA(true);
                return;
            }

            processLoginSuccess(response);

        } catch (error: any) {
            // Suppress console error to avoid "Next.js Error" overlay/logs for expected auth failures
            const msg = error.message || 'Error al iniciar sesión';
            toast.error(msg, {
                style: {
                    background: 'rgba(255, 0, 0, 0.1)',
                    border: '1px solid rgba(255, 0, 0, 0.2)',
                    color: '#ff4b4b',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 p-4">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/20 hover:shadow-primary/10">

                {require2FA ? (
                    <TwoFactorForm
                        tempToken={tempToken}
                        onSuccess={processLoginSuccess}
                        onCancel={() => setRequire2FA(false)}
                    />
                ) : (
                    <>
                        {/* Header */}
                        <div className="mb-8 flex flex-col items-center text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/50">
                                <ShieldCheck className="h-8 w-8 text-primary animate-pulse" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-white">Bienvenido</h1>
                            <p className="mt-2 text-sm text-zinc-400">
                                Ingresa tus credenciales para acceder al sistema seguro.
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-zinc-300">Correo Electrónico</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="nombre@ejemplo.com"
                                        className="pl-10 border-white/10 bg-white/5 text-white placeholder:text-zinc-600 focus:border-primary focus:ring-primary/20"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
                                    <a href="#" className="text-xs text-primary hover:text-primary/80">¿Olvido su contraseña?</a>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10 border-white/10 bg-white/5 text-white placeholder:text-zinc-600 focus:border-primary focus:ring-primary/20"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="remember" className="text-sm text-zinc-400 cursor-pointer">Mantener sesión iniciada</Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Validando...
                                    </>
                                ) : (
                                    'Ingresar al Sistema'
                                )}
                            </Button>

                            <p className="text-center text-xs text-zinc-500 mt-4">
                                Protegido por encriptación avanzada SSL/TLS.
                            </p>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
