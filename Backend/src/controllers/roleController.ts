import { Request, Response } from 'express';
import { Role } from '../models/Role';

// @desc    Get roles by Organization ID
// @route   GET /api/roles/:organizationId
// @access  Private
export const getRoles = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;
        const roles = await Role.find({ organization: organizationId });
        res.json(roles);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al obtener roles' });
    }
};

// @desc    Create a new role
// @route   POST /api/roles
// @access  Private
export const createRole = async (req: Request, res: Response) => {
    try {
        const { name, organization, permissions, allowSuperAdmin } = req.body;

        // Check if role name already exists in org
        const existing = await Role.findOne({ name, organization });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe un rol con ese nombre en esta organización.' });
        }

        const role = await Role.create({
            name,
            organization,
            permissions,
            allowSuperAdmin
        });
        res.status(201).json(role);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear rol' });
    }
};

// @desc    Update a role
// @route   PUT /api/roles/:id
// @access  Private
export const updateRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, permissions, allowSuperAdmin, isAuditAuthorized } = req.body;
        const role = await Role.findById(id);

        if (!role) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }

        role.name = name || role.name;
        role.permissions = permissions || role.permissions;
        role.allowSuperAdmin = typeof allowSuperAdmin !== 'undefined' ? allowSuperAdmin : role.allowSuperAdmin;

        const updatedRole = await role.save();
        res.json(updatedRole);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al actualizar rol' });
    }
};

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Private
export const deleteRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Optional: Check if role is in use by users before deleting
        // ...

        const role = await Role.findById(id);
        if (!role) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }

        if (role.isSystem) {
            return res.status(403).json({ message: 'No se pueden eliminar los roles del sistema.' });
        }

        await Role.findByIdAndDelete(id);
        res.json({ message: 'Rol eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al eliminar rol' });
    }
};

// @desc    Seed default roles for an organization
// @route   POST /api/roles/seed/:organizationId
// @access  Private
// @desc    Seed default roles for an organization
// @route   POST /api/roles/seed/:organizationId
// @access  Private
export const seedRoles = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params;

        const allModules = [
            'pos', 'inventory', 'customers', 'suppliers', 'purchases',
            'cash', 'sales', 'invoices', 'mass-update', 'statistics',
            'import-export', 'web-page', 'team', 'personalization',
            'integrations', 'settings', 'appointments', 'checks'
        ];

        const settingsTabs = [
            'general', 'tickets', 'pos', 'prices', 'branches', 'barcodes', 'afip', 'backups'
        ];

        const checkingAccountTabs = ['view_account', 'movements', 'void_movements'];
        const cashTabs = ['void_movement'];
        const salesTabs = ['void_sale'];
        const appointmentTabs = ['calendar', 'alerts', 'settings'];
        const checkTabs = ['own', 'third_party'];

        const createPermissions = (view = false, edit = false, del = false, fullTabs = false) => {
            return allModules.map(module => ({
                module,
                view,
                edit,
                delete: del,
                tabs: module === 'settings'
                    ? settingsTabs.map(tab => ({ name: tab, enabled: fullTabs }))
                    : (module === 'customers' || module === 'suppliers')
                        ? checkingAccountTabs.map(tab => ({ name: tab, enabled: fullTabs }))
                        : (module === 'cash')
                            ? cashTabs.map(tab => ({ name: tab, enabled: fullTabs }))
                            : (module === 'sales')
                                ? salesTabs.map(tab => ({ name: tab, enabled: fullTabs }))
                                : (module === 'appointments')
                                    ? appointmentTabs.map(tab => ({ name: tab, enabled: fullTabs }))
                                    : (module === 'checks')
                                        ? checkTabs.map(tab => ({ name: tab, enabled: fullTabs }))
                                        : []
            }));
        };

        const defaultRoles = [
            {
                name: 'Admin',
                organization: organizationId,
                isSystem: true,
                permissions: createPermissions(true, true, true, true)
            },
            {
                name: 'Encargado',
                organization: organizationId,
                isSystem: true,
                permissions: allModules.map(module => {
                    const isConfig = ['personalization', 'integrations', 'settings', 'team'].includes(module);
                    return {
                        module,
                        view: true,
                        edit: !isConfig,
                        delete: false,
                        tabs: module === 'settings'
                            ? settingsTabs.map(tab => ({ name: tab, enabled: ['tickets', 'prices', 'branches'].includes(tab) }))
                            : (module === 'customers' || module === 'suppliers')
                                ? checkingAccountTabs.map(tab => ({ name: tab, enabled: true }))
                                : (module === 'cash')
                                    ? cashTabs.map(tab => ({ name: tab, enabled: true })) // Encargado can void in cash
                                    : (module === 'sales')
                                        ? salesTabs.map(tab => ({ name: tab, enabled: true })) // Encargado can void sales
                                        : (module === 'appointments')
                                            ? appointmentTabs.map(tab => ({ name: tab, enabled: true }))
                                            : (module === 'checks')
                                                ? checkTabs.map(tab => ({ name: tab, enabled: true }))
                                                : []
                    };
                })
            },
            {
                name: 'Vendedor',
                organization: organizationId,
                isSystem: true,
                permissions: allModules.map(module => {
                    const canView = ['pos', 'customers', 'sales', 'inventory'].includes(module);
                    return {
                        module,
                        view: canView,
                        edit: module === 'customers',
                        delete: false,
                        tabs: module === 'settings'
                            ? settingsTabs.map(tab => ({ name: tab, enabled: false }))
                            : (module === 'customers' || module === 'suppliers')
                                ? checkingAccountTabs.map(tab => ({ name: tab, enabled: canView }))
                                : (module === 'cash')
                                    ? cashTabs.map(tab => ({ name: tab, enabled: false })) // Vendedor CANNOT void
                                    : (module === 'sales')
                                        ? salesTabs.map(tab => ({ name: tab, enabled: false })) // Vendedor CANNOT void
                                        : (module === 'appointments')
                                            ? appointmentTabs.map(tab => ({ name: tab, enabled: ['calendar', 'alerts'].includes(tab) }))
                                            : (module === 'checks')
                                                ? checkTabs.map(tab => ({ name: tab, enabled: true })) // Seller can view checks
                                                : []
                    };
                })
            },
            {
                name: 'Cajero',
                organization: organizationId,
                isSystem: true,
                permissions: allModules.map(module => {
                    const canView = ['pos', 'cash', 'sales', 'customers'].includes(module);
                    return {
                        module,
                        view: canView,
                        edit: false,
                        delete: false,
                        tabs: module === 'settings'
                            ? settingsTabs.map(tab => ({ name: tab, enabled: false }))
                            : (module === 'customers' || module === 'suppliers')
                                ? checkingAccountTabs.map(tab => ({ name: tab, enabled: false }))
                                : (module === 'cash')
                                    ? cashTabs.map(tab => ({ name: tab, enabled: false }))
                                    : (module === 'sales')
                                        ? salesTabs.map(tab => ({ name: tab, enabled: false }))
                                        : []
                    };
                })
            }
        ];

        // Borrar roles de sistema existentes para esta org para evitar duplicados si se re-seedea
        await Role.deleteMany({ organization: organizationId, isSystem: true });

        const insertedRoles = await Role.insertMany(defaultRoles);

        res.status(200).json({
            message: 'Roles creados correctamente',
            roles: insertedRoles
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al crear roles por defecto' });
    }
};
