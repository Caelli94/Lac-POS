'use client';

import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup';

export default function SecurityPage() {
    return (
        <div className="p-6 max-w-none mx-auto space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    Seguridad
                </h1>
                <p className="text-slate-500 text-sm font-medium">
                    Gestiona la seguridad de tu cuenta y métodos de autenticación.
                </p>
            </header>

            <section className="space-y-4 pt-4">
                <TwoFactorSetup />
            </section>
        </div>
    );
}
