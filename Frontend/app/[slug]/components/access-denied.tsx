'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AccessDeniedProps {
    moduleName: string;
    slug: string;
}

export function AccessDenied({ moduleName, slug }: AccessDeniedProps) {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-in fade-in zoom-in duration-500">
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full scale-150" />
                <div className="relative bg-white rounded-[2.5rem] p-8 shadow-2xl border border-red-100 ring-4 ring-red-50">
                    <ShieldAlert size={80} className="text-red-500 animate-bounce-slow" />
                </div>
            </div>

            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4">
                Acceso restringido
            </h1>

            <p className="text-slate-500 font-medium max-w-md mx-auto mb-8 leading-relaxed">
                Lo sentimos, no tienes los permisos necesarios para acceder al módulo de <strong className="text-slate-900 uppercase">{moduleName}</strong>.
                Si crees que esto es un error, contacta con tu administrador.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
                <Link href={`/${slug}`}>
                    <Button variant="outline" className="rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2">
                        <Home size={18} />
                        Ir al Inicio
                    </Button>
                </Link>

                <Button
                    onClick={() => router.back()}
                    className="bg-slate-900 hover:bg-black text-white rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-200 transition-all flex items-center gap-2"
                >
                    <ArrowLeft size={18} />
                    Regresar
                </Button>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100 w-full max-w-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    LAC-POS Security Protocol Core v2.0
                </p>
            </div>
        </div>
    );
}
