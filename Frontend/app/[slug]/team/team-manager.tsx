'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { teamService } from '@/services/teamService'
import { roleService, IPermission } from '@/services/roleService'

export interface IRole {
    _id?: string;
    name: string;
    organization: string;
    permissions: IPermission[];
    isSystem?: boolean;
    allowSuperAdmin?: boolean; // Can manage/delegate audits
    commission_info?: {
        is_enabled: boolean;
        type: 'gross' | 'net';
        percentage: number;
    };
}
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Trash2, UserPlus, Users, Loader2, Shield, Pencil, AlertTriangle,
    Search, Filter, User, Check, Settings, ShieldCheck, Lock, Eye, Save,
    ShoppingCart, Package, UserCircle, Truck, FileChartColumnIncreasing,
    Banknote, History, Receipt, Zap, CheckCircle2, MoreHorizontal, Mail,
    ShieldAlert, Globe, ChartBar, ArrowLeftRight, Palette, Blocks, Plus, X, BookOpen, CalendarDays, LayoutDashboard, Landmark, Bot, Percent
} from "lucide-react"
import { toast } from 'sonner'
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { LimitReachedModal } from '@/components/limit-reached-modal'

// ...

import { useRouter } from 'next/navigation'

const modules = [
    { name: 'Agenda / Inicio', code: 'agenda', id: 'agenda', hasTabs: false, icon: LayoutDashboard },
    { name: 'Punto de Venta', code: 'pos', id: 'pos', hasTabs: false, icon: ShoppingCart },
    { name: 'Inventario', code: 'inventory', id: 'inventory', hasTabs: true, icon: Package },
    { name: 'Clientes', code: 'customers', id: 'customers', hasTabs: true, icon: UserCircle }, // Tabs: Balances, Payments
    { name: 'Turnero', code: 'appointments', id: 'appointments', hasTabs: true, icon: CalendarDays },
    { name: 'Proveedores', code: 'suppliers', id: 'suppliers', hasTabs: true, icon: Truck },  // Tabs: Balances, Payments
    { name: 'Cheques', code: 'checks', id: 'checks', hasTabs: true, icon: Landmark },
    { name: 'Compras/Encargues', code: 'purchases', id: 'purchases', hasTabs: true, icon: FileChartColumnIncreasing },
    { name: 'Caja', code: 'cash', id: 'cash', hasTabs: true, icon: Banknote }, // Tabs: Movements, Closure, Void
    { name: 'Historial', code: 'sales', id: 'sales', hasTabs: true, icon: History }, // Tabs: New, History, Void
    { name: 'Reportes Fiscales', code: 'invoices', id: 'invoices', hasTabs: false, icon: Receipt },
    { name: 'Act. Masiva', code: 'mass-update', id: 'mass-update', hasTabs: true, icon: Zap },
    { name: 'Estadísticas', code: 'statistics', id: 'statistics', hasTabs: true, icon: ChartBar },
    { name: 'Importar/Exportar', code: 'import-export', id: 'import-export', hasTabs: true, icon: ArrowLeftRight },
    { name: 'Página Web', code: 'web-page', id: 'web-page', hasTabs: false, icon: Globe },
    { name: 'Equipo', code: 'team', id: 'team', hasTabs: true, icon: Users },
    { name: 'Comisiones', code: 'commissions', id: 'commissions', hasTabs: true, icon: Percent },
    { name: 'Personalización', code: 'personalization', id: 'personalization', hasTabs: false, icon: Palette },
    { name: 'Integraciones', code: 'integrations', id: 'integrations', hasTabs: true, icon: Blocks },
    { name: 'Seguridad (2FA)', code: '2fa', id: '2fa', hasTabs: false, icon: ShieldCheck },
    { name: 'Ajustes', code: 'settings', id: 'settings', hasTabs: true, icon: Settings },
    { name: 'Guía', code: 'guide', id: 'guide', hasTabs: false, icon: BookOpen },
    { name: 'Asistente IA', code: 'ai_assistant', id: 'ai_assistant', hasTabs: false, icon: Bot },
];

const importExportTabs = [{ name: 'Importar', code: 'import', id: 'import' }, { name: 'Exportar', code: 'export', id: 'export' }];
const statisticsTabs = [
    { name: 'Ventas', code: 'sales', id: 'sales' },
    { name: 'Clientes', code: 'customers', id: 'customers' },
    { name: 'Proveedores', code: 'suppliers', id: 'suppliers' },
    { name: 'Productos', code: 'products', id: 'products' }
];
const massUpdateTabs = [
    { name: 'Actualización de Precios', code: 'prices', id: 'prices' },
    { name: 'Mensajería Masiva', code: 'messaging', id: 'messaging' }
];

const settingsTabs = [
    { name: 'General', code: 'general', id: 'general' },
    { name: 'Tickets', code: 'tickets', id: 'tickets' },
    { name: 'Puntos de Venta', code: 'pos', id: 'pos' },
    { name: 'Listas de Precios', code: 'prices', id: 'prices' },
    { name: 'Sucursales', code: 'branches', id: 'branches' },
    { name: 'Códigos de Barra', code: 'barcodes', id: 'barcodes' },
    { name: 'Configuración AFIP', code: 'afip', id: 'afip' },
    { name: 'Backups', code: 'backups', id: 'backups' }
];
const cashTabs = [{ name: 'Movimientos', code: 'movements', id: 'movements' }, { name: 'Cierre', code: 'closure', id: 'closure' }, { name: 'Anular Mov.', code: 'void_movement', id: 'void_movement' }, { name: 'Ver Detalle', code: 'view_detail', id: 'view_detail' }, { name: 'Historial', code: 'history', id: 'history' }];
const salesTabs = [{ name: 'Ver Detalle', code: 'view_detail', id: 'view_detail' }, { name: 'Historial', code: 'history', id: 'history' }, { name: 'Anular Vta.', code: 'void_sale', id: 'void_sale' }];
const checkingAccountTabs = [{ name: 'Saldos', code: 'balances', id: 'balances' }, { name: 'Pagos', code: 'payments', id: 'payments' }];
const appointmentTabs = [{ name: 'Calendario', code: 'calendar', id: 'calendar' }, { name: 'Radar de Alertas', code: 'alerts', id: 'alerts' }, { name: 'Configuración', code: 'settings', id: 'settings' }];
const checkTabs = [{ name: 'Cheques Propios', code: 'own', id: 'own' }, { name: 'Cheques de Terceros', code: 'third_party', id: 'third_party' }];
const purchasesTabs = [{ name: 'Compras', code: 'purchases', id: 'purchases' }, { name: 'Encargues', code: 'orders', id: 'orders' }];
const inventoryTabs = [
    { name: 'Imágenes', code: 'images', id: 'images' },
    { name: 'Lotes y Vencimientos', code: 'batch_management', id: 'batch_management' }
];

const integrationsTabs = [
    { name: 'Mercado Pago', code: 'mercadopago', id: 'mercadopago' },
    { name: 'Tienda Nube', code: 'tiendanube', id: 'tiendanube' },
    { name: 'Wix', code: 'wix', id: 'wix' }
];

const commissionTabs = [
    { name: 'Historial', code: 'history', id: 'history' },
    { name: 'Reglas de Venta', code: 'rules', id: 'rules' },
    { name: 'Pagos', code: 'payments', id: 'payments' }
];

const teamTabs = [
    { name: 'Miembros', code: 'members', id: 'members' },
    { name: 'Roles y Permisos', code: 'roles', id: 'roles' }
];


export function TeamManager({ orgId, currentUserId, userRole, permissions, features, isAuditManager, disabledTabs = [] }: { orgId: string, currentUserId?: string, userRole?: string, permissions?: any[], features: string[], isAuditManager?: boolean, disabledTabs?: string[] }) {
    console.log('TeamManager Features:', features);
    // ... imports and setups ...
    const router = useRouter()
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isOpen, setIsOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'user', roleId: 'none',
        allowSuperAdmin: false, isAuditManager: false
    })

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [roles, setRoles] = useState<IRole[]>([])
    const [loadingRoles, setLoadingRoles] = useState(false)
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
    const [editingRole, setEditingRole] = useState<IRole | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState('ALL')
    const [activeTab, setActiveTab] = useState('members')

    // Commission State
    const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false)
    const [selectedCommissionUser, setSelectedCommissionUser] = useState<any>(null)
    const [userCommissions, setUserCommissions] = useState<any[]>([])
    const [loadingCommissions, setLoadingCommissions] = useState(false)

    const fetchUserCommissions = async (userId: string) => {
        setLoadingCommissions(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
            const res = await fetch(`${baseUrl}/sales/commissions/${userId}`, {
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Error fetching');
            const data = await res.json();
            setUserCommissions(data);
        } catch (error) {
            toast.error('Error cargando historial de comisiones');
        } finally {
            setLoadingCommissions(false);
        }
    }

    const openCommissionHistorial = (user: any) => {
        setSelectedCommissionUser(user);
        setIsCommissionModalOpen(true);
        fetchUserCommissions(user._id);
    }

    // Data Fetching
    const fetchTeam = async () => {
        setLoading(true)
        try {
            const data = await teamService.getTeam(orgId)
            setMembers(data)
        } catch (error) {
            toast.error('Error al cargar equipo')
        } finally {
            setLoading(false)
        }
    }

    const fetchRoles = async () => {
        setLoadingRoles(true)
        try {
            const data = await roleService.getRoles(orgId)
            const sorted = data.sort((a: any, b: any) => {
                if (a.name === 'Admin') return -1;
                if (b.name === 'Admin') return 1;
                return 0;
            });
            setRoles(sorted)
        } catch (error) {
            console.error(error)
            // Silent fail ok
        } finally {
            setLoadingRoles(false)
        }
    }

    useEffect(() => {
        if (orgId) {
            fetchTeam()
            fetchRoles()
        }
    }, [orgId])

    const filteredMembers = useMemo(() => {
        let res = members;
        if (searchTerm) {
            res = res.filter((m: any) =>
                m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (roleFilter !== 'ALL') {
            res = res.filter((m: any) => m.roleId === roleFilter || (m.role === roleFilter));
        }
        return res;
    }, [members, searchTerm, roleFilter])

    // Role Management Functions
    const canEdit = (moduleCode: string) => {
        // if (userRole === 'admin') return true; 
        // Audit Manager has restricted permissions usually, but logic depends on app.
        // Assuming admin bypass:
        if (userRole === 'admin') return true;

        if (!permissions) return false;
        const perm = permissions.find(p => p.module === moduleCode);
        return perm?.edit || false;
    }

    const canDelete = (moduleCode: string) => {
        if (userRole === 'admin') return true;
        if (!permissions) return false;
        const perm = permissions.find(p => p.module === moduleCode);
        return perm?.delete || false;
    }

    const openAdd = () => {
        setEditingId(null)
        setFormData({ name: '', email: '', password: '', role: 'user', roleId: 'none', allowSuperAdmin: false, isAuditManager: false })
        setIsOpen(true)
    }

    const openEdit = (member: any) => {
        setEditingId(member._id)
        setFormData({
            name: member.name,
            email: member.email,
            password: '', // Don't show password
            role: member.role,
            roleId: member.roleId && typeof member.roleId === 'object' ? member.roleId._id : member.roleId || 'none',
            allowSuperAdmin: member.allowSuperAdmin || false,
            isAuditManager: member.isAuditManager || false
        })
        setIsOpen(true)
    }



    // Limit Modal State
    const [showLimitModal, setShowLimitModal] = useState(false)
    const [limitType, setLimitType] = useState<'users' | 'products' | 'suppliers' | 'customers' | 'generic'>('generic')

    // ...

    const handleSave = async () => {
        if (!formData.name || !formData.email) {
            toast.error('Nombre y email son obligatorios')
            return
        }
        if (!editingId && !formData.password) {
            toast.error('La contraseña es obligatoria para nuevos usuarios')
            return
        }

        const dataToSend = {
            ...formData,
            roleId: formData.roleId === 'none' ? null : formData.roleId,
            allowSuperAdmin: formData.allowSuperAdmin,
            isAuditManager: formData.isAuditManager
        };

        setSaving(true)
        try {
            if (editingId) {
                await teamService.updateMember(editingId, dataToSend)
                toast.success('Miembro actualizado')
                setIsOpen(false)
                fetchTeam()
                if (editingId === currentUserId) {
                    router.refresh();
                }
            } else {
                await teamService.addMember({ ...dataToSend, organizationId: orgId })
                toast.success('Miembro agregado')
                setIsOpen(false)
                fetchTeam()
            }
        } catch (error: any) {
            const msg = error.message || error.response?.data?.message || 'Error al guardar';
            if (msg.includes('LIMIT_REACHED')) {
                setLimitType('users');
                setShowLimitModal(true);
            } else {
                toast.error(msg)
            }
        } finally {
            setSaving(false)
        }
    }

    // ...


    const confirmDelete = async () => {
        if (!deleteId) return
        try {
            await teamService.removeMember(deleteId)
            toast.success('Usuario eliminado')
            setDeleteId(null)
            fetchTeam()
        } catch (error) {
            toast.error('Error al eliminar')
        }
    }

    const toggleAllSelection = (checked: boolean) => {
        if (checked) setSelectedIds(new Set(filteredMembers.map(m => m._id)))
        else setSelectedIds(new Set())
    }

    const toggleRowSelection = (id: string) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) newSelected.delete(id)
        else newSelected.add(id)
        setSelectedIds(newSelected)
    }

    // Role Management Functions
    const openAddRole = () => {
        const defaultPermissions: IPermission[] = modules.map(m => ({
            module: m.id,
            view: false,
            edit: false,
            delete: false,
            tabs: m.hasTabs ? (() => {
                switch (m.id) {
                    case 'sales': return salesTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'cash': return cashTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'customers': return checkingAccountTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'suppliers': return checkingAccountTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'settings': return settingsTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'import-export': return importExportTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'statistics': return statisticsTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'purchases': return purchasesTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'mass-update': return massUpdateTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'inventory': return inventoryTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'integrations': return integrationsTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'commissions': return commissionTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'team': return teamTabs.map(t => ({ name: t.id, enabled: false }));
                    case 'ai_assistant': return [];
                    default: return [];
                }
            })() : undefined
        }))

        setEditingRole({
            name: '',
            organization: orgId,
            permissions: defaultPermissions,
            allowSuperAdmin: false,
            commission_info: {
                is_enabled: false,
                type: 'gross',
                percentage: 0
            }
        })
        setIsRoleDialogOpen(true)
    }

    const openEditRole = (role: IRole) => {
        const isAdmin = role.name === 'Admin';

        // Backfill missing permissions for new modules (like 'guide')
        // We create a map of existing permissions for O(1) lookup
        const existingPermsMap = new Map(role.permissions.map(p => [p.module, p]));

        // Merge existing with defaults for ALL active modules
        const mergedPermissions: IPermission[] = modules.map(m => {
            if (existingPermsMap.has(m.id)) {
                const existingPerm = existingPermsMap.get(m.id)!;

                // Deep merge tabs to ensure new tabs appear and bad ones (General) are removed
                if (m.hasTabs) {
                    let validTabs: any[] = [];
                    switch (m.id) {
                        case 'sales': validTabs = salesTabs; break;
                        case 'cash': validTabs = cashTabs; break;
                        case 'customers': validTabs = checkingAccountTabs; break;
                        case 'suppliers': validTabs = checkingAccountTabs; break;
                        case 'settings': validTabs = settingsTabs; break;
                        case 'import-export': validTabs = importExportTabs; break;
                        case 'statistics': validTabs = statisticsTabs; break;
                        case 'purchases': validTabs = purchasesTabs; break;
                        case 'mass-update': validTabs = massUpdateTabs; break;
                        case 'inventory': validTabs = inventoryTabs; break;
                        case 'ai_assistant': validTabs = []; break;
                        case 'appointments': validTabs = appointmentTabs; break;
                        case 'checks': validTabs = checkTabs; break;
                        case 'integrations': validTabs = integrationsTabs; break;
                        case 'commissions': validTabs = commissionTabs; break;
                        case 'team': validTabs = teamTabs; break;
                        default: validTabs = [];
                    }

                    const existingTabsMap = new Map((existingPerm.tabs || []).map((t: any) => [t.name, t]));

                    const mergedTabs = validTabs.map(vt => {
                        // Check for match by ID (preferred) or Name (legacy support)
                        if (existingTabsMap.has(vt.id) || existingTabsMap.has(vt.name)) {
                            // Keep existing state if valid
                            const tab = existingTabsMap.get(vt.id) || existingTabsMap.get(vt.name);
                            return isAdmin ? { ...tab, enabled: true, name: vt.id } : { ...tab, name: vt.id }; // Normalize name to ID
                        }
                        // If "General" was here, it won't match "new", "history", etc., so it gets dropped.
                        // New tabs (void) get added as disabled.
                        return { name: vt.id, enabled: isAdmin };
                    });

                    // Ensure all sub-permissions are true for Admin
                    return {
                        ...existingPerm,
                        tabs: mergedTabs,
                        view: isAdmin ? true : existingPerm.view,
                        edit: isAdmin ? true : existingPerm.edit,
                        delete: isAdmin ? true : existingPerm.delete
                    };
                }

                // Standard module logic
                return {
                    ...existingPerm,
                    view: isAdmin ? true : existingPerm.view,
                    edit: isAdmin ? true : existingPerm.edit,
                    delete: isAdmin ? true : existingPerm.delete
                };
            } else {
                // New module not in role yet
                return {
                    module: m.id,
                    view: isAdmin,
                    edit: isAdmin,
                    delete: isAdmin,
                    tabs: m.hasTabs ? (() => {
                        switch (m.id) {
                            case 'sales': return salesTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'cash': return cashTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'customers': return checkingAccountTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'suppliers': return checkingAccountTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'settings': return settingsTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'import-export': return importExportTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'statistics': return statisticsTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'purchases': return purchasesTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'mass-update': return massUpdateTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'inventory': return inventoryTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'ai_assistant': return [];
                            case 'appointments': return appointmentTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'checks': return checkTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'integrations': return integrationsTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'commissions': return commissionTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            case 'team': return teamTabs.map(t => ({ name: t.id, enabled: isAdmin }));
                            default: return [];
                        }
                    })() : undefined
                };
            }
        });

        // Also keep permissions for modules that might not be active but exist in the role (legacy/hidden modules)
        // (Optional: but maybe safer to just stick to active modules to avoid clutter)
        // For now, let's just ensure we have all active modules:

        setEditingRole({ ...role, permissions: mergedPermissions })
        setIsRoleDialogOpen(true)
    }

    const handleSaveRole = async () => {
        if (!editingRole?.name) {
            toast.error('El nombre del rol es obligatorio')
            return
        }

        setSaving(true)
        try {
            if (editingRole._id) {
                await roleService.updateRole(editingRole._id, editingRole)
                toast.success('Rol actualizado')
            } else {
                await roleService.createRole(editingRole)
                toast.success('Rol creado')
            }
            setIsRoleDialogOpen(false)
            fetchRoles()
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar rol')
        } finally {
            setSaving(false)
        }
    }

    const handleSeedRoles = async () => {
        setLoadingRoles(true)
        try {
            await roleService.seedRoles(orgId)
            await fetchRoles()
            toast.success('Roles por defecto generados correctamente')
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Error al generar roles')
        } finally {
            setLoadingRoles(false)
        }
    }

    const handleDeleteRole = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este rol?')) return
        try {
            await roleService.deleteRole(id)
            toast.success('Rol eliminado')
            fetchRoles()
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al eliminar rol')
        }
    }

    const togglePermission = (moduleName: string, field: 'view' | 'edit' | 'delete') => {
        if (!editingRole || !editingRole.permissions) return
        const newPermissions = editingRole.permissions.map(p => {
            if (p.module === moduleName) {
                return { ...p, [field]: !p[field] }
            }
            return p
        })
        setEditingRole({ ...editingRole, permissions: newPermissions })
    }

    const toggleTabPermission = (moduleIndex: number, tabIndex: number) => {
        if (!editingRole || !editingRole.permissions) return
        const newPermissions = [...editingRole.permissions]
        const module = newPermissions[moduleIndex]
        if (!module.tabs) return

        const newTabs = [...module.tabs]
        newTabs[tabIndex] = {
            ...newTabs[tabIndex],
            enabled: !newTabs[tabIndex].enabled
        }

        newPermissions[moduleIndex] = { ...module, tabs: newTabs }
        setEditingRole({ ...editingRole, permissions: newPermissions })
    }

    const handlePermissionChange = (moduleName: string, field: 'view' | 'edit' | 'delete' | 'tabs', value: any) => {
        if (!editingRole || !editingRole.permissions) return;

        const newPermissions = editingRole.permissions.map(p => {
            if (p.module === moduleName) {
                return { ...p, [field]: value };
            }
            return p;
        });
        setEditingRole({ ...editingRole, permissions: newPermissions });
    };

    const toggleNamedTabPermission = (moduleName: string, tabName: string) => {
        if (!editingRole) return;
        const currentPerms = editingRole.permissions?.find((p: any) => p.module === moduleName);
        const currentTabs = currentPerms?.tabs || [];

        let newTabs;
        const existingTab = currentTabs.find((t: any) => t.name === tabName);

        if (existingTab) {
            // Toggle
            newTabs = currentTabs.map((t: any) =>
                t.name === tabName ? { ...t, enabled: !t.enabled } : t
            );
        } else {
            // Add (Enable by default)
            newTabs = [...currentTabs, { name: tabName, enabled: true }];
        }

        handlePermissionChange(moduleName, 'tabs', newTabs);
    }

    if (loading) return (
        <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200 p-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-slate-400" size={40} />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando Equipo...</p>
        </div>
    )


    return (
        <>
            <LimitReachedModal isOpen={showLimitModal} onClose={() => setShowLimitModal(false)} limitType={limitType} />
            <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="mb-6 w-full justify-start h-auto p-1 bg-slate-100 rounded-2xl overflow-x-auto print:hidden">
                    <TabsTrigger
                        value="members"
                        className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-xs uppercase tracking-wider transition-all duration-300"
                    >
                        <div className="flex items-center gap-2">
                            <Users size={16} />
                            MIEMBROS
                        </div>
                    </TabsTrigger>
                    <TabsTrigger
                        value="roles"
                        className="rounded-xl px-8 py-3 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 text-slate-500 font-bold text-xs uppercase tracking-wider transition-all duration-300"
                    >
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} />
                            ROLES Y PERMISOS
                        </div>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* TOOLBAR */}
                    <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1 flex-[2] min-w-[200px]">
                            <div className="px-3 h-9 bg-slate-200 rounded-lg flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase border border-slate-300">
                                <Search size={14} /> BUSCAR
                            </div>
                            <Input
                                placeholder="Nombre o Email..."
                                className="bg-transparent border-0 focus-visible:ring-0 text-slate-900 text-sm h-9 shadow-none flex-1"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* FILTER: ROL */}
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <div className="pl-3 pr-1 text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Filter size={10} /> Filtro:</div>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="bg-white border-none rounded-lg h-9 text-[10px] font-black uppercase px-4 min-w-[130px] shadow-sm focus:ring-2 focus:ring-primary/20">
                                    <SelectValue placeholder="Filtrar por Rol" />
                                </SelectTrigger>
                                <SelectContent className="min-w-[150px]">
                                    <SelectItem value="ALL" className="text-[10px] uppercase font-bold text-slate-400">Todos los Miembros</SelectItem>
                                    <SelectItem value="admin" className="text-[10px] uppercase font-bold text-purple-600">Admins</SelectItem>
                                    {roles.length > 0 && (
                                        <>
                                            <div className="px-3 py-1.5 text-[8px] font-black text-slate-300 uppercase tracking-widest border-t border-slate-50 mt-1">Roles</div>
                                            {roles.filter(r => r.name.toLowerCase() !== 'admin').map(r => (
                                                <SelectItem key={r._id} value={r._id!} className="text-[10px] uppercase font-bold">
                                                    {r.name}
                                                </SelectItem>
                                            ))}
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2 ml-auto items-center">
                            {canEdit('team') && (
                                <Button onClick={openAdd} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200">
                                    <UserPlus size={16} className="mr-2" />
                                    Nuevo Miembro
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* MAIN TABLE */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/80 h-10">
                                <TableRow className="text-[10px] uppercase font-black border-slate-200 hover:bg-transparent">
                                    <TableHead className="w-12 text-center">
                                        <Checkbox
                                            checked={selectedIds.size === filteredMembers.length && filteredMembers.length > 0}
                                            onCheckedChange={toggleAllSelection}
                                        />
                                    </TableHead>
                                    <TableHead className="w-14 text-center">Avatar</TableHead>
                                    <TableHead>Nombre y Contacto</TableHead>
                                    <TableHead>Rol y Nivel de Acceso</TableHead>
                                    <TableHead className="text-right px-6">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMembers.map((member) => (
                                    <TableRow key={member._id} className="h-16 hover:bg-slate-50 transition-colors group">
                                        <TableCell className="text-center p-4">
                                            <Checkbox
                                                checked={selectedIds.has(member._id)}
                                                onCheckedChange={() => toggleRowSelection(member._id)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-center p-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto border border-slate-200">
                                                <User size={18} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-sm">{member.name}</span>
                                                <span className="text-[10px] font-medium text-slate-400 lowercase">{member.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-4">
                                            {member.role === 'admin' ? (
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide bg-purple-100 text-purple-700 border border-purple-200 shadow-sm">
                                                        <Shield size={10} className="mr-1.5" />
                                                        Admin
                                                    </span>
                                                    {member.isAuditManager && (
                                                        <span className="inline-flex items-center text-[9px] font-bold text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                                            <ShieldCheck size={8} className="mr-1" />
                                                            Gestor de Auditoría
                                                        </span>
                                                    )}
                                                </div>
                                            ) : member.roleId ? (
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide bg-blue-100 text-blue-700 border border-blue-200">
                                                        <ShieldCheck size={10} className="mr-1.5" />
                                                        {(() => {
                                                            const roleId = typeof member.roleId === 'object' ? member.roleId._id : member.roleId;
                                                            const resolvedRole = roles.find(r => r._id === roleId);
                                                            return member.roleId.name || resolvedRole?.name || 'Rol Sin Nombre';
                                                        })()}
                                                    </span>
                                                    {member.isAuditManager && (
                                                        <span className="inline-flex items-center text-[9px] font-bold text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                                            <ShieldCheck size={8} className="mr-1" />
                                                            Gestor de Auditoría
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide bg-slate-100 text-slate-500 border border-slate-200">
                                                        Usuario Estándar
                                                    </span>
                                                    {member.isAuditManager && (
                                                        <span className="inline-flex items-center text-[9px] font-bold text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                                            <ShieldCheck size={8} className="mr-1" />
                                                            Gestor de Auditoría
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="p-4 text-right px-6">
                                            <div className="flex justify-end gap-2">
                                                {(()=>{
                                                    const roleId = typeof member.roleId === 'object' ? member.roleId._id : member.roleId;
                                                    const resolvedRole = roles.find(r => r._id === roleId);
                                                    const isCommEnabled = member.roleId?.commission_info?.is_enabled || resolvedRole?.commission_info?.is_enabled;
                                                    if (isCommEnabled) {
                                                        return (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Historial de Comisiones"
                                                                onClick={() => openCommissionHistorial(member)}
                                                                className="h-8 w-8 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all rounded-lg"
                                                            >
                                                                <Percent size={16} />
                                                            </Button>
                                                        )
                                                    }
                                                    return null;
                                                })()}
                                                {canEdit('team') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEdit(member)}
                                                        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg"
                                                    >
                                                        <Pencil size={16} />
                                                    </Button>
                                                )}
                                                {canDelete('team') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-red-50 transition-all rounded-lg"
                                                        onClick={() => setDeleteId(member._id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="roles" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                                <Shield size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Gestión de Roles</p>
                                <p className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Define los permisos de Ver, Editar y Borrar para cada módulo</p>
                            </div>
                        </div>
                        {canEdit('team') && (
                            <Button onClick={openAddRole} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] px-6 h-10 tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200">
                                <Plus size={16} className="mr-2" />
                                Crear Nuevo Rol
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {roles.length === 0 && !loadingRoles && (
                            <div className="col-span-full py-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 animate-in fade-in duration-700">
                                <Shield className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sin Roles Definidos</h3>
                                <p className="text-slate-500 text-sm font-medium mb-8">Empieza con la configuración estándar del sistema</p>
                                <Button
                                    onClick={handleSeedRoles}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs px-10 h-14 rounded-2xl shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mx-auto"
                                >
                                    <Zap size={18} />
                                    Generar Roles Iniciales
                                </Button>
                            </div>
                        )}
                        {loadingRoles ? (
                            <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-200" size={40} /></div>
                        ) : roles.map((role) => (
                            <div key={role._id} className="group relative bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => openEditRole(role)} className="h-8 w-8 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all">
                                            <Pencil size={14} />
                                        </Button>
                                        {!role.isSystem && (
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role._id!)} className="h-8 w-8 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all">
                                                <Trash2 size={14} />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{role.name}</h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {role.isSystem && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Rol del Sistema</span>}
                                        {role.allowSuperAdmin && (
                                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-full border border-red-100 flex items-center gap-1">
                                                <ShieldAlert size={10} />
                                                Auditoría Activada
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Resumen de Permisos</p>
                                    <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Eye size={12} className="text-blue-500" />
                                            Ver: {role.permissions.filter(p => p.view).length} módulos
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Pencil size={12} className="text-amber-500" />
                                            Editar: {role.permissions.filter(p => p.edit).length} módulos
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>

                {/* ROLE DIALOG (Permissions Matrix) */}
                <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                    <DialogContent className="w-[95vw] sm:max-w-6xl bg-white rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        <DialogHeader className="bg-slate-50 p-8 border-b border-slate-100 shrink-0">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                    <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                                        <ShieldCheck className="text-blue-600" size={24} />
                                        {editingRole?._id ? 'Editar Rol' : 'Nuevo Rol Personalizado'}
                                    </DialogTitle>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Configura los permisos detallados por módulo</p>
                                </div>

                                <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="space-y-1 pr-4 border-r border-slate-100">
                                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1">Nombre del Rol</Label>
                                        <Input
                                            value={editingRole?.name || ''}
                                            onChange={e => setEditingRole(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                                            placeholder="Ej. Vendedor Senior"
                                            className="h-10 border-none bg-slate-50 rounded-xl font-bold uppercase text-xs focus-visible:ring-0 w-[200px]"
                                            disabled={editingRole?.name === 'Admin'}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 pl-2">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black uppercase text-slate-700 leading-none">Poder Global</span>
                                            <span className="text-[8px] font-bold uppercase text-slate-400 tracking-widest mt-1">Super Admin</span>
                                        </div>
                                        <Switch
                                            checked={editingRole?.allowSuperAdmin || false}
                                            onCheckedChange={(checked) => setEditingRole(prev => prev ? ({ ...prev, allowSuperAdmin: !!checked }) : null)}
                                            className="data-[state=checked]:bg-blue-600"
                                            disabled={editingRole?.name === 'Admin'}
                                        />
                                    </div>
                                </div>
                            </div>
                        </DialogHeader>

                        <ScrollArea className="flex-1 min-h-0 bg-white">
                            <div className="p-8 space-y-8">
                                <div className="space-y-8 max-w-5xl mx-auto">
                                    {/* CABECERA INTERNA DE OPCIONES (Opcional, ya tenemos en el header) */}


                                    {/* COMISIONES POR VENTA */}
                                    <div className="flex flex-col gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <Label className="text-sm font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                                                    <Percent size={16} className="text-emerald-500" />
                                                    Comisiones por Venta
                                                </Label>
                                                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wide mt-1">
                                                    Configura si los usuarios con este rol ganan comisión y cómo se calcula.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={editingRole?.commission_info?.is_enabled || false}
                                                onCheckedChange={(c) => setEditingRole(prev => prev ? { ...prev, commission_info: { ...(prev.commission_info || { type: 'gross', percentage: 0 }), is_enabled: !!c } } : null)}
                                            />
                                        </div>

                                        {editingRole?.commission_info?.is_enabled && (
                                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Base de Cálculo</Label>
                                                    <Select
                                                        value={editingRole?.commission_info?.type || 'gross'}
                                                        onValueChange={(val: 'gross' | 'net') => setEditingRole(prev => prev ? { ...prev, commission_info: { ...(prev.commission_info || { is_enabled: true, percentage: 0 }), type: val } } : null)}
                                                    >
                                                        <SelectTrigger className="h-12 rounded-xl text-xs font-bold uppercase bg-slate-50 hover:bg-slate-100 focus:ring-0 border-slate-200">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="gross" className="text-xs uppercase font-bold text-slate-700">G. Bruta (Total Ticket)</SelectItem>
                                                            <SelectItem value="net" className="text-xs uppercase font-bold text-slate-700">G. Neta (Total - Costos)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Porcentaje (%)</Label>
                                                    <Input
                                                        type="number"
                                                        value={editingRole?.commission_info?.percentage || 0}
                                                        onChange={(e) => setEditingRole(prev => prev ? { ...prev, commission_info: { ...(prev.commission_info || { is_enabled: true, type: 'gross' }), percentage: parseFloat(e.target.value) || 0 } } : null)}
                                                        className="h-12 rounded-xl text-lg font-black bg-slate-50 hover:bg-slate-100 focus:ring-0 border-slate-200"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {editingRole?.name === 'Admin' && (
                                    <div className="mb-6 mx-1 p-5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100/50 flex items-center justify-center shrink-0 border border-blue-200">
                                            <ShieldCheck className="text-blue-600" size={20} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black uppercase tracking-tight text-blue-900">Rol de Administrador Protegido</p>
                                            <p className="text-xs text-blue-600/80 font-medium leading-relaxed max-w-lg">
                                                Este rol garantiza acceso total al sistema.
                                                Sus permisos están <strong>bloqueados en "Habilitado"</strong> para prevenir pérdidas de acceso accidentales.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* RED BOX - EFFECTIVE AUTHORIZATION (Only if current user/role can manage it) */}
                                {editingRole?.allowSuperAdmin && (
                                    <div className="bg-amber-50 border border-amber-200 p-5 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="shrink-0 w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black uppercase text-amber-900 tracking-tight">Política de Delegación Activada</p>
                                            <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                                                Los miembros con este rol ahora podrán autorizar accesos de auditoría de Super Admin desde sus propios perfiles.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-slate-900 h-14">
                                            <TableRow className="hover:bg-transparent border-none">
                                                <TableHead className="text-white font-black uppercase tracking-widest text-[11px] px-8">Módulo / Sección</TableHead>
                                                <TableHead className="text-center text-white font-black uppercase tracking-widest text-[11px] w-32 border-l border-white/10">Ver</TableHead>
                                                <TableHead className="text-center text-white font-black uppercase tracking-widest text-[11px] w-32 border-l border-white/10">Editar</TableHead>
                                                <TableHead className="text-center text-white font-black uppercase tracking-widest text-[11px] w-32 border-l border-white/10">Borrar</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {modules.filter(m => features.includes(m.code) || m.code === 'team' || m.code === 'settings').map((m, mIdx) => {
                                                // Find permission index in the editingRole.permissions array
                                                // We use findIndex because we need to update the array at that index
                                                const pIdx = editingRole?.permissions.findIndex(per => per.module === m.id) ?? -1;
                                                const p = (pIdx !== -1 && editingRole?.permissions) ? editingRole.permissions[pIdx] : null;
                                                const isLocked = editingRole?.name === 'Admin';

                                                return (
                                                    <React.Fragment key={m.id}>
                                                        <TableRow className="h-16 hover:bg-slate-50/50 transition-colors border-slate-100">
                                                            <TableCell className="px-8 font-black text-slate-800 text-xs uppercase tracking-tight">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200/50">
                                                                        <m.icon size={16} />
                                                                    </div>
                                                                    {m.name}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center border-l border-slate-100">
                                                                <div className="flex justify-center">
                                                                    <Checkbox
                                                                        checked={p?.view || false}
                                                                        disabled={isLocked}
                                                                        onCheckedChange={() => togglePermission(m.id, 'view')}
                                                                        className="w-6 h-6 rounded-lg data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 disabled:opacity-50"
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center border-l border-slate-100">
                                                                <div className="flex justify-center">
                                                                    <Checkbox
                                                                        checked={p?.edit || false}
                                                                        disabled={isLocked}
                                                                        onCheckedChange={() => togglePermission(m.id, 'edit')}
                                                                        className="w-6 h-6 rounded-lg data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 disabled:opacity-50"
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center border-l border-slate-100">
                                                                <div className="flex justify-center">
                                                                    <Checkbox
                                                                        checked={p?.delete || false}
                                                                        disabled={isLocked}
                                                                        onCheckedChange={() => togglePermission(m.id, 'delete')}
                                                                        className="w-6 h-6 rounded-lg data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 disabled:opacity-50"
                                                                    />
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>

                                                        {/* DYNAMIC TABS RENDER */}
                                                        {m.hasTabs && p?.view && (() => {
                                                            let tabsDef: any[] = [];
                                                            switch (m.id) {
                                                                case 'sales': tabsDef = salesTabs; break;
                                                                case 'cash': tabsDef = cashTabs; break;
                                                                case 'customers': tabsDef = checkingAccountTabs; break;
                                                                case 'suppliers': tabsDef = checkingAccountTabs; break;
                                                                case 'appointments': tabsDef = appointmentTabs; break;
                                                                case 'checks': tabsDef = checkTabs; break;
                                                                case 'settings': tabsDef = settingsTabs; break;
                                                                case 'import-export': tabsDef = importExportTabs; break;
                                                                case 'statistics': tabsDef = statisticsTabs; break;
                                                                case 'purchases': tabsDef = purchasesTabs; break;
                                                                case 'mass-update': tabsDef = massUpdateTabs; break;
                                                                case 'inventory': tabsDef = inventoryTabs; break;
                                                                case 'integrations': tabsDef = integrationsTabs; break;
                                                                case 'commissions': tabsDef = commissionTabs; break;
                                                                case 'team': tabsDef = teamTabs; break;
                                                                default: tabsDef = [];
                                                            }

                                                            if (tabsDef.length === 0) return null;

                                                            return (
                                                                <TableRow key={`tabs-${m.id}`} className="bg-slate-50/30 border-none animate-in fade-in slide-in-from-top-1 duration-300">
                                                                    <TableCell colSpan={4} className="p-0">
                                                                        <div className="px-12 py-6 space-y-4">
                                                                            <div className="flex items-center gap-2 mb-4">
                                                                                <div className="text-slate-400">
                                                                                    {m.id === 'settings' ? <Settings size={14} /> : <Blocks size={14} />}
                                                                                </div>
                                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                                    Permisos Específicos de {m.name}
                                                                                </p>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                                {tabsDef.filter(t => !disabledTabs.includes(t.id)).map(tab => {
                                                                                    const isEnabled = p?.tabs?.find((t: any) => t.name === tab.id)?.enabled;
                                                                                    return (
                                                                                        <div key={tab.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors">
                                                                                            <Checkbox
                                                                                                checked={!!isEnabled}
                                                                                                disabled={isLocked}
                                                                                                onCheckedChange={() => toggleNamedTabPermission(m.id, tab.id)}
                                                                                                className="w-5 h-5 rounded-md data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 disabled:opacity-50"
                                                                                            />
                                                                                            <span className={cn(
                                                                                                "text-[10px] font-bold uppercase truncate",
                                                                                                isEnabled ? "text-indigo-700" : "text-slate-600"
                                                                                            )}>
                                                                                                {tab.name}
                                                                                            </span>
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })()}
                                                    </React.Fragment>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </ScrollArea>

                        <DialogFooter className="p-8 bg-slate-50/80 backdrop-blur-md border-t border-slate-100 shrink-0">
                            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)} className="rounded-2xl h-14 font-black uppercase text-xs px-10 border-slate-200 hover:bg-white">Cancelar</Button>
                            <Button onClick={handleSaveRole} disabled={saving} className="bg-slate-900 hover:bg-black text-white rounded-2xl h-14 font-black uppercase text-xs tracking-widest px-12 shadow-xl shadow-slate-200 flex items-center gap-2">
                                {saving ? <Loader2 className="animate-spin mr-2" /> : <Save size={18} />}
                                {editingRole?._id ? 'Actualizar Rol' : 'Confirmar y Guardar Rol'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ADD/EDIT MIEMBRO DIALOG */}
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="w-[95vw] sm:max-w-xl bg-white rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
                        <DialogHeader className="bg-slate-50 p-8 border-b border-slate-100 shrink-0">
                            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                                <UserPlus className="text-slate-900" size={24} />
                                {editingId ? 'Editar Miembro' : 'Nuevo Miembro'}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Nombre Completo</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej. Juan Pérez"
                                        className="rounded-2xl border-slate-200 h-12 font-bold focus:ring-slate-900/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Correo Electrónico</Label>
                                    <Input
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="juan@empresa.com"
                                        className="rounded-2xl border-slate-200 h-12 font-bold focus:ring-slate-900/10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Contraseña {editingId && '(Opcional)'}</Label>
                                <Input
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    type="password"
                                    placeholder={editingId ? "Dejar vacío para no cambiar" : "********"}
                                    className="rounded-2xl border-slate-200 h-12 font-bold focus:ring-slate-900/10"
                                />
                            </div>

                            <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200">
                                <Label className="text-xs font-black uppercase text-slate-500 tracking-widest ml-1 flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-indigo-600" />
                                    Rol de Acceso
                                </Label>
                                <Select
                                    value={formData.roleId === 'none' || !formData.roleId ? (formData.role === 'admin' ? roles.find(r => r.name === 'Admin')?._id : 'none') : formData.roleId}
                                    onValueChange={val => {
                                        const selectedRole = roles.find(r => r._id === val);
                                        setFormData({
                                            ...formData,
                                            roleId: val,
                                            role: selectedRole?.name === 'Admin' ? 'admin' : 'user'
                                        });
                                    }}
                                >
                                    <SelectTrigger className="rounded-2xl border-slate-200 bg-white h-14 font-bold focus:ring-slate-900/10 shadow-sm">
                                        <SelectValue placeholder="Seleccionar Rol..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200">
                                        {roles.length > 0 ? (
                                            <>
                                                <div className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">Roles Disponibles</div>
                                                {roles.map(r => (
                                                    <SelectItem key={r._id} value={r._id!} className={cn(
                                                        "font-bold py-3 uppercase text-[10px]",
                                                        r.name === 'Admin' ? "text-purple-600 focus:bg-purple-50" : "text-indigo-600"
                                                    )}>
                                                        {r.name === 'Admin' ? 'Administrador' : r.name}
                                                    </SelectItem>
                                                ))}
                                                <div className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100 mt-2 mb-1">Otras Opciones</div>
                                                <SelectItem value="none" className="font-bold py-3 uppercase text-[10px] text-slate-400 italic">Sin Rol (Acceso Mínimo)</SelectItem>
                                            </>
                                        ) : (
                                            <>
                                                <SelectItem value="none" className="font-bold py-3 uppercase text-[10px] text-slate-400 italic">Sin Rol (Acceso Mínimo)</SelectItem>
                                                <div className="p-4 text-center text-[10px] text-slate-300 font-bold uppercase">No se encontraron roles personalizados</div>
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-slate-400 font-medium tracking-wide leading-relaxed px-1 italic">
                                    {formData.role === 'admin'
                                        ? 'El administrador tiene acceso total a todos los módulos y ajustes del sistema sin restricciones.'
                                        : 'Los roles personalizados definen exactamente qué módulos podrá ver y editar este miembro.'
                                    }
                                </p>

                                {/* SUPER ADMIN AUTHORIZATION ALERT - RESTORED FOR MEMBERS */}
                                {(userRole === 'admin') && (
                                    <div className="mt-4 flex flex-col md:flex-row items-center gap-6 bg-slate-50/50 p-6 rounded-3xl border border-dashed border-slate-200 animate-in fade-in slide-in-from-top-2 duration-500">
                                        <div className="shrink-0 w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-600 shadow-sm border border-slate-200">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Gestor de Auditoría</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight mt-0.5 max-w-md">Habilita a este usuario para que pueda autorizar el acceso del Super Admin en los Roles del sistema.</p>
                                        </div>
                                        <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-black uppercase text-indigo-600 leading-none">Habilitar</span>
                                                <span className="text-[8px] font-bold uppercase text-slate-400 tracking-widest mt-1">Gestión</span>
                                            </div>
                                            <Switch
                                                checked={formData.isAuditManager || false}
                                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAuditManager: !!checked }))}
                                                className="data-[state=checked]:bg-indigo-600"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>



                        <DialogFooter className="p-8 bg-slate-50/80 backdrop-blur-md border-t border-slate-100 shrink-0">
                            <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-2xl h-14 font-black uppercase text-xs px-10 border-slate-200 hover:bg-white">Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-black text-white rounded-2xl h-14 font-black uppercase text-xs tracking-widest px-12 shadow-xl shadow-slate-200 flex items-center gap-2">
                                {saving ? <Loader2 className="animate-spin mr-2" /> : <Save size={18} />}
                                {editingId ? 'Actualizar Miembro' : 'Confirmar y Guardar'}
                            </Button>
                        </DialogFooter>
                    </DialogContent >
                </Dialog >



                {/* DELETE ALERT DIALOG */}
                < AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <AlertDialogContent className="w-[95vw] sm:max-w-[420px] bg-white rounded-[3rem] p-10 border-none shadow-2xl animate-in fade-in zoom-in duration-300">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-center text-slate-900">¿Eliminar Usuario?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <div className="flex flex-col items-center text-center space-y-6 mt-4">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 border border-red-100 shadow-inner">
                                <AlertTriangle size={38} className="animate-bounce-slow" />
                            </div>
                            <AlertDialogDescription className="text-slate-500 font-medium leading-relaxed">
                                Esta acción eliminará permanentemente al usuario del equipo y revocar todos sus accesos de forma inmediata.
                            </AlertDialogDescription>
                            <div className="w-full grid grid-cols-2 gap-4 pt-4">
                                <AlertDialogCancel className="rounded-2xl h-14 font-black uppercase text-xs border-slate-200">Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-2xl h-14 font-black uppercase text-xs shadow-xl shadow-red-100">
                                    Eliminar Ahora
                                </AlertDialogAction>
                            </div>
                        </div>
                    </AlertDialogContent>
                </AlertDialog >

                {/* COMMISSIONS MODAL */}
                <Dialog open={isCommissionModalOpen} onOpenChange={setIsCommissionModalOpen}>
                    <DialogContent className="w-[95vw] sm:max-w-3xl bg-white rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
                        <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100 shrink-0">
                            <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                                <Percent className="text-emerald-500" size={24} />
                                Historial de Comisiones
                            </DialogTitle>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                                {selectedCommissionUser?.name}
                            </p>
                        </DialogHeader>
                        <div className="p-6 flex-1 flex flex-col min-h-0">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
                                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Total Acumulado</p>
                                        <p className="text-2xl font-black text-emerald-700 mt-1">
                                            ${userCommissions.reduce((acc, curr) => acc + (curr.commission_amount || 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                        <Banknote size={24} />
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ventas con Comisión</p>
                                        <p className="text-2xl font-black text-slate-700 mt-1">
                                            {userCommissions.length}
                                        </p>
                                    </div>
                                    <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center text-slate-500">
                                        <Receipt size={24} />
                                    </div>
                                </div>
                            </div>

                            <ScrollArea className="flex-1 pr-4">
                                {loadingCommissions ? (
                                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                        <Loader2 className="animate-spin text-emerald-400" size={40} />
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Calculando Comisiones...</p>
                                    </div>
                                ) : userCommissions.length === 0 ? (
                                    <div className="text-center py-20">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto border border-slate-100 mb-4">
                                            <Percent size={32} />
                                        </div>
                                        <p className="text-slate-400 font-black uppercase text-xs tracking-widest">
                                            Sin comisiones registradas
                                        </p>
                                        <p className="text-slate-400 text-[10px] mt-2 font-medium">Las comisiones aparecerán aquí una vez que el usuario cierre ventas.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {userCommissions.map(comm => (
                                            <div key={comm._id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-emerald-200 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-110 transition-all">
                                                        <Percent size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900 uppercase">
                                                            Ticket #{comm.ticket_number?.toString().padStart(5, '0')}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400">
                                                            {new Date(comm.date).toLocaleString('es-AR')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-emerald-600">
                                                        +${comm.commission_amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                        Venta Total: ${comm.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100">
                            <Button onClick={() => setIsCommissionModalOpen(false)} variant="outline" className="w-full rounded-2xl font-black uppercase text-xs h-14 bg-white hover:bg-slate-100 transition-colors">
                                Cerrar Historial
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </Tabs >
        </>
    )
}

