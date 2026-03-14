'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/authService';
import { toast } from 'sonner';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TwoFactorFormProps {
    tempToken: string;
    onSuccess: (userData: any) => void;
    onCancel: () => void;
}

export function TwoFactorForm({ tempToken, onSuccess, onCancel }: TwoFactorFormProps) {
    const [token, setToken] = useState('');
    const [isRecovery, setIsRecovery] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await authService.validate2FALogin(
                tempToken,
                isRecovery ? '' : token,
                isRecovery ? recoveryCode : undefined
            );

            toast.success('Verificación Exitosa');
            onSuccess(result); // Pass user data back to parent to handle redirect

        } catch (error: any) {
            toast.error(error.message || 'Código inválido');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center text-white">
                <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                    <ShieldAlert className="text-primary h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold">Verificación de Seguridad</h2>
                <p className="text-sm text-zinc-400 mt-2">
                    {isRecovery
                        ? 'Ingrese uno de sus códigos de recuperación de emergencia.'
                        : 'Ingrese el código de 6 dígitos de su aplicación autenticadora.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {!isRecovery ? (
                    <div className="space-y-2">
                        <Label className="text-zinc-300">Código de Autenticación</Label>
                        <Input
                            value={token}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setToken(val);
                            }}
                            className="bg-white/5 border-white/10 text-center text-2xl tracking-[0.5em] text-white font-mono"
                            placeholder="000000"
                            autoFocus
                        />
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label className="text-zinc-300">Código de Recuperación</Label>
                        <Input
                            value={recoveryCode}
                            onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                            className="bg-white/5 border-white/10 text-center text-xl text-white font-mono"
                            placeholder="ABCDEF"
                            autoFocus
                        />
                    </div>
                )}

                <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={loading || (!isRecovery && token.length < 6) || (isRecovery && recoveryCode.length < 3)}
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verificar
                </Button>

                <div className="flex justify-between text-sm mt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-zinc-500 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsRecovery(!isRecovery)}
                        className="text-primary hover:text-primary/80 transition-colors"
                    >
                        {isRecovery ? 'Usar App Autenticadora' : 'Usar Código de Recuperación'}
                    </button>
                </div>
            </form>
        </div>
    );
}
