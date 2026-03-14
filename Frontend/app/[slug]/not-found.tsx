'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    const router = useRouter()

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl text-center max-w-lg w-full border border-slate-100 animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>

                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-4">
                    ACCESO RESTRINGIDO
                </h1>

                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                    Lo sentimos, no tienes los permisos necesarios para acceder a este módulo o el recurso no existe. Si crees que esto es un error, contacta con tu administrador.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.back()}
                        className="h-12 rounded-xl font-bold uppercase text-xs"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Regresar
                    </Button>

                    <Button
                        asChild
                        className="h-12 rounded-xl font-bold uppercase text-xs bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" />
                            Ir al Inicio
                        </Link>
                    </Button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50">
                    <p className="text-[10px] text-slate-300 font-bold tracking-widest uppercase">
                        LAC-POS SECURITY PROTOCOL CORE V2.0
                    </p>
                </div>
            </div>
        </div>
    )
}
