'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    History,
    FileChartColumnIncreasing,
    Truck,
    Receipt,
    Users,
    Settings,
    UserCircle,
    Banknote,
    Palette,
    Blocks,
    ChartBar,
    ArrowLeftRight,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Sun,
    Moon,
    Globe,
    Zap,
    BookOpen,
    ShieldCheck,
    CalendarDays,
    Landmark
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { authService } from '@/services/authService'

interface SidebarProps {
    slug: string
    orgName: string
    userName?: string
    userRole?: string
    rolePermissions?: any[]
    features: string[]
    isCollapsed?: boolean
    onToggle?: () => void
}

export function TenantSidebar({ slug, orgName, userName, userRole, rolePermissions, features, isCollapsed, onToggle }: SidebarProps) {
    const pathname = usePathname()
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Evitar errores de hidratación
    React.useEffect(() => {
        setMounted(true)
    }, [])

    // Función auxiliar para saber si el link está activo
    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

    // Aseguramos que features sea un array (por si viene undefined)
    const safeFeatures = features || []

    // RBAC: Función para verificar si el usuario puede ver un módulo
    const canView = (module: string) => {
        // 1. Verificar si la organización tiene la feature habilitada
        if (!safeFeatures.includes(module)) return false;

        // 2. Si es admin de sistema (el string 'admin' en el campo role original), permitimos todo por ahora
        // a menos que tenga un roleId específico asignado.
        if (userRole === 'admin' && !rolePermissions) return true;

        // 3. Si tiene permisos asignados vía roleId
        if (rolePermissions) {
            const perm = rolePermissions.find((p: any) => p.module === module);
            return perm ? perm.view : false;
        }

        // 4. Default: permitir si no hay restricciones de rol definidas (retrocompatibilidad)
        return true;
    };

    return (
        <aside className={cn(
            "bg-white border-r border-slate-200 flex flex-col fixed h-full inset-y-0 z-50 transition-all duration-300",
            isCollapsed ? "w-20" : "w-64"
        )}>

            {/* HEADER */}
            <div className={cn("p-6 border-b border-slate-100", isCollapsed && "px-4 py-6")}>
                <div className="flex items-center gap-3 relative">
                    <div className="w-10 h-10 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {orgName.substring(0, 2).toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <div className="overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
                            <h2 className="font-bold text-slate-800 truncate text-sm" title={orgName}>
                                {orgName}
                            </h2>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-indigo-600 font-bold truncate leading-tight" title={userName}>
                                    {userName || 'Sesión Activa'}
                                </span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-tighter font-medium truncate leading-none mt-0.5">
                                    {userRole || 'Usuario'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Botón de colapsar */}
                    <button
                        onClick={onToggle}
                        className={cn(
                            "absolute flex items-center justify-center w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm z-10",
                            isCollapsed ? "left-12" : "-right-9"
                        )}
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>

                    {/* Botón de Modo Oscuro/Claro (Solo si no está colapsado) */}
                    {!isCollapsed && mounted && (
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 dark:hover:bg-[var(--primary)]/20 transition-all shrink-0"
                            title={theme === 'dark' ? "Modo Claro" : "Modo Oscuro"}
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    )}
                </div>
            </div>

            {/* NAV */}
            <nav className="flex-1 px-4 space-y-1 mt-6 overflow-y-auto custom-scrollbar">

                {/* 1. Inicio (Check 'agenda' feature) */}
                {canView('agenda') && (
                    <SidebarLink
                        href={`/${slug}`}
                        icon={<LayoutDashboard size={20} />}
                        label="Inicio"
                        active={pathname === `/${slug}`}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 2. Punto de Venta */}
                {canView('pos') && (
                    <SidebarLink
                        href={`/${slug}/pos`}
                        icon={<ShoppingCart size={20} />}
                        label="Punto de Venta"
                        active={isActive(`/${slug}/pos`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 3. Inventario */}
                {canView('inventory') && (
                    <SidebarLink
                        href={`/${slug}/inventory`}
                        icon={<Package size={20} />}
                        label="Inventario"
                        active={isActive(`/${slug}/inventory`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 4. Clientes */}
                {canView('customers') && (
                    <SidebarLink
                        href={`/${slug}/customers`}
                        icon={<UserCircle size={20} />}
                        label="Clientes"
                        active={isActive(`/${slug}/customers`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 4.5 Turnero */}
                {canView('appointments') && (
                    <SidebarLink
                        href={`/${slug}/appointments`}
                        icon={<CalendarDays size={20} />}
                        label="Turnero"
                        active={isActive(`/${slug}/appointments`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 5. Proveedores */}
                {canView('suppliers') && (
                    <SidebarLink
                        href={`/${slug}/suppliers`}
                        icon={<Truck size={20} />}
                        label="Proveedores"
                        active={isActive(`/${slug}/suppliers`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 5.5 Cheques */}
                {canView('checks') && (
                    <SidebarLink
                        href={`/${slug}/checks`}
                        icon={<Landmark size={20} />}
                        label="Cheques"
                        active={isActive(`/${slug}/checks`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 6. Compras */}
                {canView('purchases') && (
                    <SidebarLink
                        href={`/${slug}/purchases`}
                        icon={<FileChartColumnIncreasing size={20} />}
                        label="Compras/Encargues"
                        active={isActive(`/${slug}/purchases`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 7. Caja */}
                {canView('cash') && (
                    <SidebarLink
                        href={`/${slug}/cash`}
                        icon={<Banknote size={20} />}
                        label="Caja"
                        active={isActive(`/${slug}/cash`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 8. Historial de Ventas */}
                {canView('sales') && (
                    <SidebarLink
                        href={`/${slug}/sales`}
                        icon={<History size={20} />}
                        label="Historial de Ventas"
                        active={isActive(`/${slug}/sales`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 9. Reportes Fiscales */}
                {canView('invoices') && (
                    <SidebarLink
                        href={`/${slug}/invoices`}
                        icon={<Receipt size={20} />}
                        label="Reportes Fiscales"
                        active={isActive(`/${slug}/invoices`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 9.5. Actualización Masiva */}
                {canView('mass-update') && (
                    <SidebarLink
                        href={`/${slug}/mass-update`}
                        icon={<Zap size={20} />}
                        label="Actualización Masiva"
                        active={isActive(`/${slug}/mass-update`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 10. Estadísticas */}
                {canView('statistics') && (
                    <SidebarLink
                        href={`/${slug}/statistics`}
                        icon={<ChartBar size={20} />}
                        label="Estadísticas"
                        active={isActive(`/${slug}/statistics`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 11. Importar/Exportar */}
                {canView('import-export') && (
                    <SidebarLink
                        href={`/${slug}/import-export`}
                        icon={<ArrowLeftRight size={20} />}
                        label="Importar/Exportar"
                        active={isActive(`/${slug}/import-export`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* 12. Página Web */}
                {canView('web-page') && (
                    <SidebarLink
                        href={`/${slug}/web-page`}
                        icon={<Globe size={20} />}
                        label="Página Web"
                        active={isActive(`/${slug}/web-page`)}
                        isCollapsed={isCollapsed}
                    />
                )}

                {/* --- CONFIGURACIÓN --- */}
                <div className={cn("pt-4 mt-4 border-t border-slate-100", isCollapsed && "px-0")}>
                    {!isCollapsed && (
                        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-2 animate-in fade-in duration-300">
                            Configuración
                        </p>
                    )}

                    {canView('team') && (
                        <SidebarLink
                            href={`/${slug}/team`}
                            icon={<Users size={20} />}
                            label="Equipo"
                            active={isActive(`/${slug}/team`)}
                            isCollapsed={isCollapsed}
                        />
                    )}

                    {canView('commissions') && (
                        <SidebarLink
                            href={`/${slug}/commissions`}
                            icon={<Banknote size={20} />}
                            label="Comisiones"
                            active={isActive(`/${slug}/commissions`)}
                            isCollapsed={isCollapsed}
                        />
                    )}

                    {canView('personalization') && (
                        <SidebarLink
                            href={`/${slug}/personalization`}
                            icon={<Palette size={20} />}
                            label="Personalización"
                            active={isActive(`/${slug}/personalization`)}
                            isCollapsed={isCollapsed}
                        />
                    )}

                    {canView('integrations') && (
                        <SidebarLink
                            href={`/${slug}/integrations`}
                            icon={<Blocks size={20} />}
                            label="Integraciones"
                            active={isActive(`/${slug}/integrations`)}
                            isCollapsed={isCollapsed}
                        />
                    )}

                    {canView('2fa') && (
                        <SidebarLink
                            href={`/${slug}/settings/security`}
                            icon={<ShieldCheck size={20} />}
                            label="Seguridad"
                            active={isActive(`/${slug}/settings/security`)}
                            isCollapsed={isCollapsed}
                        />
                    )}

                    {canView('settings') && (
                        <SidebarLink
                            href={`/${slug}/settings`}
                            icon={<Settings size={20} />}
                            label="Ajustes"
                            active={isActive(`/${slug}/settings`) && !pathname.includes('/settings/security')}
                            isCollapsed={isCollapsed}
                        />
                    )}

                    {canView('guide') && (
                        <SidebarLink
                            href={`/${slug}/guide`}
                            icon={<BookOpen size={20} />}
                            label="Guía"
                            active={isActive(`/${slug}/guide`)}
                            isCollapsed={isCollapsed}
                        />
                    )}
                </div>

            </nav>

            {/* FOOTER */}
            <div className={cn("p-4 border-t border-slate-200", isCollapsed && "px-2")}>
                <button
                    onClick={async () => {
                        try {
                            await authService.logout();
                            toast.success('Sesión cerrada correctamente');
                            window.location.href = '/login'; // Full reload to clear any client state
                        } catch (error) {
                            console.error("Logout failed", error);
                            window.location.href = '/login';
                        }
                    }}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all w-full",
                        isCollapsed && "justify-center px-0 h-10 w-10 mx-auto"
                    )}>
                    <LogOut size={20} />
                    {!isCollapsed && <span className="animate-in fade-in duration-300">Cerrar Sesión</span>}
                </button>
            </div>

        </aside>
    )
}

function SidebarLink({ href, icon, label, active, isCollapsed }: { href: string; icon: React.ReactNode; label: string; active: boolean, isCollapsed?: boolean }) {
    return (
        <Link
            href={href}
            title={isCollapsed ? label : ""}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 sidebar-link",
                active
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] font-bold sidebar-link-active"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[var(--primary)]",
                isCollapsed && "justify-center px-0 h-10 w-10 mx-auto"
            )}
        >
            <div className={cn("shrink-0", isCollapsed && "flex items-center justify-center")}>
                {icon}
            </div>
            {!isCollapsed && <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">{label}</span>}
        </Link>
    )
}