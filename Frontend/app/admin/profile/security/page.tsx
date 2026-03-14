'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function SecurityPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const user = await authService.getMe();

                if (user && user.role === 'superadmin') {
                    setIsAuthorized(true);
                } else {
                    // Start redirect, components will unmount or layout will handle
                    router.push('/admin/dashboard');
                }
            } catch (error) {
                router.push('/login');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    if (isLoading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (!isAuthorized) return null;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Seguridad</h1>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">Autenticación en Dos Pasos (2FA)</h2>
                </div>

                <TwoFactorSetup />
            </section>
        </div>
    );
}
