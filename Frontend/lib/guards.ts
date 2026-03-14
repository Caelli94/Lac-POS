import { notFound } from 'next/navigation';
import { organizationService } from '@/services/organizationService';
import { getServerUser } from './server-auth';
import { roleService } from '@/services/roleService';

/**
 * ACLARACIÓN: requireFeature verifica que la organización exista por su 'slug'
 * y que tenga habilitado el módulo indicado en 'featureCode'.
 * Si no se cumple, lanza notFound().
 */
export async function requireFeature(slug: string, featureCode: string) {
    const org = await organizationService.getBySlug(slug);
    if (!org) return notFound();

    const is_enabled = org.features?.find((f: any) => f.code === featureCode)?.is_enabled;
    if (!is_enabled) return notFound();

    return org;
}

/**
 * verifyModuleAccess verifica si el usuario actual tiene permisos de rol (RBAC)
 * para ver el módulo indicado.
 * También permite acceso al Super Admin si la organización lo ha autorizado en algún rol.
 */
export async function verifyModuleAccess(slug: string, moduleName: string) {
    // 1. Verificar si la organización tiene la feature habilitada (Capa de Super Admin)
    const org = await organizationService.getBySlug(slug);
    if (!org) return false;

    // Los módulos 'team' y 'settings' siempre están habilitados a nivel de org (config base)
    const isFeatureEnabled = moduleName === 'team' || moduleName === 'settings' ||
        org.features?.find((f: any) => f.code === moduleName)?.is_enabled;

    if (!isFeatureEnabled) return false;

    // 2. Verificar permisos de rol (Capa de RBAC)
    const user = await getServerUser();
    if (!user) return false;

    const userOrgId = String(user.organization?._id || user.organization || '').toLowerCase();
    const orgId = String(org._id || org.id || '').toLowerCase();
    const isMember = userOrgId === orgId;

    // Caso especial: Super Admin EXTERNO (auditor sin vinculación de membresía a la org)
    // El Super Admin es un auditor externo solo si el ID de su organización NO coincide.
    if ((user?.role === 'admin' || user?.role === 'superadmin') && !isMember) {
        try {
            const roles = await roleService.getRoles(orgId);
            // El Super Admin tiene acceso si ALGÚN rol de la org ha autorizado el acceso al Super Admin
            // Y ese rol tiene permiso de ver el módulo en cuestión.
            const isAuthorizedByClient = roles.some(r =>
                r.allowSuperAdmin &&
                r.permissions.find(p => p.module === moduleName)?.view
            );
            return isAuthorizedByClient;
        } catch (error) {
            console.error("Error verificando autorización de Super Admin:", error);
            return false;
        }
    }

    // Caso: Usuario normal o usuario con rol específico asignado
    const hasPermission = user?.roleId?.permissions?.find(
        (p: any) => p.module === moduleName
    )?.view;

    // Si es un admin local (dueño), tiene acceso a todo lo habilitado por Feature
    return !!hasPermission || (user?.role === 'admin' && isMember);
}
