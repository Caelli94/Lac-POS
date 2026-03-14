"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Monitor } from "lucide-react";
import { useRouter } from "next/navigation";

interface RegisterSelectorProps {
    registers: any[];
    slug: string;
}

export function RegisterSelector({ registers, slug }: RegisterSelectorProps) {
    const router = useRouter();

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedId = localStorage.getItem('lac_terminal_id');
            if (savedId) {
                console.log("Restaurando terminal desde localStorage:", savedId);
                // Si existe un ID guardado, redirigimos inmediatamente agregándolo a la URL
                // Esto permite que el servidor (page.tsx) lo detecte y re-establezca la cookie
                router.replace(`/${slug}/pos?registerId=${savedId}`);
            }
        }
    }, [slug, router]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-lg text-center space-y-6 border border-slate-100">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Monitor size={48} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Terminal No Configurada</h1>
                    <p className="text-slate-500 font-medium text-sm leading-relaxed px-4">
                        Este equipo no está vinculado a ninguna caja.
                        Para operar el Punto de Venta, ve a la configuración y asigna esta terminal.
                    </p>
                </div>

                <div className="pt-4">
                    <Button
                        onClick={() => router.push(`/${slug}/settings?tab=pos`)}
                        className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 transition-all active:scale-95"
                    >
                        Ir a Ajustes - Puntos de Venta
                    </Button>
                </div>
            </div>
        </div>
    );
}
