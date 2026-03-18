import { notFound, redirect } from 'next/navigation'
import { SidebarLayout } from './components/sidebar-layout'
import { organizationService } from '@/services/organizationService'
import { getServerUser } from '@/lib/server-auth';
import { roleService } from '@/services/roleService';
import { ShieldAlert } from 'lucide-react';
import { LogoutButton } from '@/components/auth/logout-button';

interface Props {
    children: React.ReactNode
    params: Promise<{ slug: string }>
}

export default async function TenantLayout({ children, params }: Props) {
    const { slug } = await params

    // EXCEPCIÓN: Si el slug es "organizations" u otros prefijos de sistema, no buscamos organización
    // (Esto previene errores si hay colisión de rutas en el middleware)
    if (slug === 'organizations' || slug === 'admin' || slug === 'superadmin') return <>{children}</>;

    const org = await organizationService.getBySlug(slug);
    if (!org) return notFound()

    // BLOQUEO POR SUSPENSIÓN: Si la organización está suspendida, bloqueamos el acceso
    if (org.subscription_status === 'suspended') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans text-foreground">
                <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-200 transition-all duration-300">
                    <div className="mb-8 flex flex-col items-center text-center">
                        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-red-50 ring-1 ring-red-100 shadow-sm">
                            <ShieldAlert className="text-red-600" size={48} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">Cuenta Suspendida</h1>
                        <p className="mt-4 text-slate-500 font-medium leading-relaxed">
                            El acceso a la organización <strong className="text-slate-900 font-black">{org.name}</strong> ha sido restringido temporalmente por el proveedor.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 text-center">
                            <p className="text-sm text-red-700 font-bold mb-1">Motivo: Falta de pago o infracción de términos.</p>
                            <p className="text-xs text-red-500 font-medium italic">Para reactivar su servicio, por favor regularice su situación.</p>
                        </div>

                        <div className="bg-slate-900 rounded-2xl p-6 text-white text-center space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Atención Personalizada</p>
                            <p className="text-lg font-black tracking-tight">Comuníquese con Soporte Técnico</p>
                            <p className="text-2xl font-black text-amber-400">+54 9 358 426-8920</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">(Luciano)</p>
                        </div>

                        <LogoutButton
                            showIcon={false}
                            variant="ghost"
                            className="flex w-full items-center justify-center rounded-xl bg-slate-100 px-4 py-6 text-[11px] font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:bg-slate-200 border-none h-auto"
                            label="Regresar al Login"
                        />
                    </div>
                </div>
            </div>
        );
    }

    // SECURITY: Validate User Membership
    const user = await getServerUser();

    // If no user (e.g. Session Expired or Mismatch DB token)
    if (!user) {
        redirect('/login?expired=true');
    }

    const userOrgId = String(user.organization?._id || user.organization || '').toLowerCase();
    const orgId = String(org._id || org.id || '').toLowerCase();

    // Identificar si es Auditor del SISTEMA (auditor externo)
    // Es aquel que NO pertenece a esta organización pero tiene rol 'admin' o 'superadmin'
    const isExternalAuditor = (user.role === 'admin' || user.role === 'superadmin') && userOrgId !== orgId;
    const isMember = userOrgId === orgId;

    // Si no es un miembro ni un auditor externo, bloqueamos.
    if (!isMember && !isExternalAuditor) {
        // ... (resto del código de Acceso Restringido se mantiene igual)
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans text-foreground">
                <div className="w-full max-w-md p-12 flex flex-col items-center justify-center text-center animate-in fade-in duration-500 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                    <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-8 border border-rose-100 shadow-sm">
                        <ShieldAlert size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Acceso Restringido</h2>
                    <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium mb-8">
                        Tu cuenta <strong className="text-slate-900 font-bold">{user.email}</strong> no tiene permisos habilitados para acceder a la organización <strong className="text-slate-900 font-bold">{org.name}</strong>.
                    </p>
                    <a href="/login" className="flex w-full items-center justify-center rounded-2xl bg-slate-900 px-6 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all hover:bg-black hover:scale-[1.02] active:scale-[0.98]">
                        Regresar al Login
                    </a>
                </div>
            </div>
        );
    }

    let finalPermissions = user.roleId?.permissions;

    // Si es un Auditor Externo (Super Admin visitando un cliente), calculamos permisos de auditoría
    if (isExternalAuditor) {
        const roles = await roleService.getRoles(orgId);
        const authorizedRoles = roles.filter(r => r.allowSuperAdmin);

        if (authorizedRoles.length === 0) {
            // Si nadie autorizó al Super Admin, mostramos pantalla de Acceso Restringido pero con mensaje de Auditoría
            return (
                <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
                    <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-amber-500/30">
                            <ShieldAlert className="text-amber-500" size={40} />
                        </div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Privacidad del Cliente activa</h1>
                        <p className="text-slate-400 text-sm">Esta organización no ha autorizado el acceso de auditoría al Super Admin. Solicite al administrador que active el permiso <strong>"Autorizar Super Admin"</strong> en su rol para poder brindar asistencia.</p>
                        <a href={`/organizations`} className="block w-full py-3 bg-white text-black font-black uppercase text-xs rounded-xl hover:bg-slate-200 transition-colors">Volver al Panel</a>
                    </div>
                </div>
            );
        }

        // Unificamos permisos de todos los roles autorizados
        const mergedPermissions: any[] = [];
        authorizedRoles.forEach(role => {
            role.permissions.forEach(perm => {
                let existing = mergedPermissions.find(p => p.module === perm.module);
                if (!existing) {
                    existing = { module: perm.module, view: false, edit: false, delete: false };
                    mergedPermissions.push(existing);
                }
                if (perm.view) existing.view = true;
                if (perm.edit) existing.edit = true;
                if (perm.delete) existing.delete = true;
            });
        });
        finalPermissions = mergedPermissions;
    }

    const activeFeatures = org.features
        ?.filter((f: any) => f.is_enabled)
        .map((f: any) => f.code) || [];

    const mergedSettings = {
        ...org.settings,
        ...(user.settings || {}),
        // Asegurar que el tema sea el del usuario si existe, sino el de la org
        theme: user.settings?.theme || org.settings?.theme,
        theme_name: user.settings?.theme_name || org.settings?.theme_name
    };

    return (
        <SidebarLayout
            slug={slug}
            userName={user.name}
            userRole={user.roleId?.name || user.role}
            rolePermissions={finalPermissions}
            features={activeFeatures}
            orgName={org.name}
            orgId={orgId}
            settings={mergedSettings}
        >
            {children}
        </SidebarLayout>
    )
}