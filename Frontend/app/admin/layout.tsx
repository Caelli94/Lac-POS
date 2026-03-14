"use client";

import Link from "next/link";
import { LayoutDashboard, Building, Settings, LogOut, Loader2, ShieldCheck, Banknote } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/authService";
import { toast } from "sonner";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const verifyAdmin = async () => {
            try {
                const user = await authService.getMe();
                if (!user || user.role !== 'superadmin') {
                    toast.error("Acceso denegado: Se requieren permisos de Super Admin.");
                    router.push('/'); // Or /login
                }
            } catch (error) {
                router.push('/login');
            } finally {
                setIsLoading(false);
            }
        };

        verifyAdmin();
    }, [router]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 font-medium text-slate-400">Verificando permisos...</span>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full">
            {/* SIDEBAR (Barra Lateral) */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full inset-y-0 z-50">
                <div className="p-6">
                    <h2 className="text-2xl font-bold tracking-tight">Super Admin</h2>
                    <p className="text-xs text-slate-400 mt-1">Gestión Centralizada</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 transition-colors">
                        <LayoutDashboard size={18} />
                        Dashboard
                    </Link>
                    <Link href="/admin/companies" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 transition-colors">
                        <Building size={18} />
                        Empresas
                    </Link>
                    <Link href="/admin/accounting" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 transition-colors">
                        <Banknote size={18} />
                        Contabilidad
                    </Link>
                    <Link href="/admin/profile/security" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 transition-colors">
                        <ShieldCheck size={18} />
                        Seguridad
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={() => authService.logout().then(() => router.push('/login'))}
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 w-full text-left"
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* CONTENIDO PRINCIPAL */}
            <main className="flex-1 ml-64 bg-slate-50">
                {children}
            </main>
        </div>
    )
}