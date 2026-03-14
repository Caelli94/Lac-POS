'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { Loader2, CheckCircle, ShieldCheck, Copy, Terminal, AlertTriangle } from 'lucide-react';

export function TwoFactorSetup({ onComplete }: { onComplete?: () => void }) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [secret, setSecret] = useState<string>('');
    const [qrCode, setQrCode] = useState<string>('');
    const [verifyCode, setVerifyCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

    const startSetup = async () => {
        setLoading(true);
        try {
            const data = await authService.generate2FA();
            setSecret(data.secret);
            setQrCode(data.qrCodeUrl);
            setStep(2);
        } catch (error) {
            toast.error('Error al generar clave 2FA');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (verifyCode.length !== 6) return;
        setLoading(true);
        try {
            const result = await authService.verify2FA(verifyCode);
            setRecoveryCodes(result.recoveryCodes);
            setStep(3);
            toast.success('¡2FA Activado Correctamente!');
            if (onComplete) onComplete();
        } catch (error) {
            toast.error('Código incorrecto. Intente de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const copyRecoveryCodes = () => {
        navigator.clipboard.writeText(recoveryCodes.join('\n'));
        toast.success('Códigos copiados al portapapeles');
    };

    if (step === 1) {
        return (
            <Card className="border-green-100 bg-green-50/20">
                <CardHeader>
                    <div className="flex items-center gap-3 text-green-700 mb-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <ShieldCheck size={24} />
                        </div>
                        <CardTitle>Activar Doble Factor</CardTitle>
                    </div>
                    <CardDescription>
                        Aumenta la seguridad de tu cuenta solicitando un código adicional al iniciar sesión.
                        Solo visible para usuarios autorizados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={startSetup}
                        disabled={loading}
                        className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl transition-all shadow-lg shadow-slate-200"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Comenzar Configuración
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (step === 2) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Escanear Código QR</CardTitle>
                    <CardDescription>
                        Abre tu app autenticadora (Google Auth, Authy) y escanea este código.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-center bg-white p-4 rounded-xl border w-fit mx-auto">
                        {qrCode && <img src={qrCode} alt="2FA QR" className="w-48 h-48" />}
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                        <p>¿No puedes escanear?</p>
                        <p className="font-mono bg-slate-100 p-1 rounded inline-block mt-1 select-all">
                            {secret}
                        </p>
                    </div>

                    <div className="space-y-2 max-w-xs mx-auto">
                        <Label>Ingresa el código de 6 dígitos</Label>
                        <Input
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value)}
                            placeholder="000 000"
                            className="text-center tracking-widest text-lg"
                            maxLength={6}
                        />
                    </div>
                </CardContent>
                <CardFooter className="justify-end">
                    <Button
                        onClick={handleVerify}
                        disabled={verifyCode.length < 6 || loading}
                        className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl transition-all shadow-lg shadow-slate-200"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verificar y Activar
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="border-green-500 shadow-lg">
            <CardHeader>
                <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle size={28} />
                    <CardTitle>¡Configuración Completa!</CardTitle>
                </div>
                <CardDescription>
                    La autenticación de doble factor está activa.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                        <div className="space-y-2">
                            <h4 className="font-semibold text-amber-800">Códigos de Recuperación</h4>
                            <p className="text-sm text-amber-700">
                                Guarda estos códigos en un lugar seguro. Si pierdes tu teléfono, son la ÚNICA forma de acceder a tu cuenta.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-950 text-green-400 p-4 rounded-md font-mono text-sm grid grid-cols-2 gap-2 relative">
                    {recoveryCodes.map((code, i) => (
                        <div key={i} className="flex gap-2">
                            <span className="text-slate-500 select-none">{i + 1}.</span>
                            <span>{code}</span>
                        </div>
                    ))}
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 text-slate-400 hover:text-white hover:bg-slate-800"
                        onClick={copyRecoveryCodes}
                    >
                        <Copy size={16} />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
