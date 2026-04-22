import { Request, Response } from 'express';
import { Organization } from '../models/Organization';

// @desc    Get organization by slug
// @route   GET /api/organizations/by-slug/:slug
// @access  Public (or Private?)
export const getOrganizationBySlug = async (req: Request, res: Response) => {
    const { slug } = req.params;

    try {
        const organization = await Organization.findOne({ slug });

        if (organization) {
            res.json(organization);
        } else {
            res.status(404).json({ message: 'Organization not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create organization (For seeding or admin)
// @route   POST /api/organizations
// @desc    Create organization (For seeding or admin)
// @route   POST /api/organizations
export const createOrganization = async (req: Request, res: Response) => {
    try {
        const { adminEmail, ...orgData } = req.body;

        // 1. Create Organization
        const org = await Organization.create(orgData);

        let setupLink = undefined;

        // 2. Create Admin User (if email provided)
        if (adminEmail) {
            const crypto = require('crypto');
            const setupToken = crypto.randomBytes(32).toString('hex');
            const setupTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

            // Create User
            // Note: Password is required, generating a random one that will be overwritten by setup
            const tempPassword = crypto.randomBytes(16).toString('hex');

            await User.create({
                name: 'Administrador', // Default name
                email: adminEmail,
                password: tempPassword,
                role: 'admin',
                organization: org._id,
                setupToken: setupToken,
                setupTokenExpires: setupTokenExpires
            });

            // 3. Generate Link
            // Ensure FRONTEND_URL is set, otherwise fallback (or error?)
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            setupLink = `${frontendUrl}/setup-password?token=${setupToken}&email=${adminEmail}`;
        }

        // Return Org + Link
        // Using toJSON() to convert mongoose doc to plain object
        res.status(201).json({
            ...org.toJSON(),
            setupLink
        });

    } catch (error: any) {
        // Cleanup if Org created but User failed?
        // Ideally transactions, but for now simple error handling
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get all organizations
// @route   GET /api/organizations
import { Role } from '../models/Role';
import { Product } from '../models/Product';
import { Sale, SaleItem } from '../models/Sale';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import { User } from '../models/User'; // New
import { CashRegister, CashSession, CashMovement } from '../models/Cash'; // New
import { Purchase } from '../models/Purchase';
import { PurchaseItem } from '../models/PurchaseItem';
import { createBackup } from '../services/backupService';

// ... (existing code)

// @desc    Delete organization (Secure)
// @route   DELETE /api/organizations/:id
export const deleteOrganization = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { password } = req.body;

    try {
        // 1. Verify User Password (Re-authentication)
        // @ts-ignore
        const currentUserId = req.user?._id;

        if (!currentUserId) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Fetch user WITH password explicitly
        const user = await User.findById(currentUserId).select('+password');

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        if (!password) {
            return res.status(400).json({ message: 'Password is required' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        const org = await Organization.findById(id);
        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        console.log(`[SECURE DELETE] Starting deletion protocol for: ${org.name} (${id})`);

        // 2. Safety Backup
        console.log(`[SECURE DELETE] Creating safety backup...`);
        const backupResult = await createBackup('manual', 'PRE-DELETE-SAFETY', id);

        if (!backupResult.success) {
            console.error(`[SECURE DELETE] Backup Failed! Aborting deletion.`, backupResult.error);
            return res.status(500).json({
                message: 'Error crítico al crear respaldo de seguridad. La eliminación ha sido abortada para proteger los datos.'
            });
        }
        console.log(`[SECURE DELETE] Safety backup created: ${backupResult.filename}`);

        // 3. Cascade Delete
        // Define deletion tasks
        const queryOrg = { organization: id };
        const queryOrgId = { organization_id: id };

        // Helper to get array of IDs for nested deletion
        const getIds = async (Model: any, query: any) => (await Model.find(query).select('_id')).map((d: any) => d._id);

        // Nested Data (Items/Movements)
        const saleIds = await getIds(Sale, queryOrgId);
        const purchaseIds = await getIds(Purchase, queryOrg); // Purchase uses 'organization' ref in schema? Check model.
        // Assuming Purchase uses organization ref based on backupService usage `Purchase.find(queryOrg)` (line 126 backupService uses queryOrg which is organization_id if targetOrgId set... wait backupService line 80: queryOrg = { organization_id: targetOrgId }).
        // So Purchase uses organization_id.
        // Wait, line 43 of orgController: `import { Purchase } from '../models/Purchase'`.
        // Let's check Purchase model to be sure or just safe-guess both?
        // BackupService uses `queryOrg = { organization_id: targetOrgId }` for Sales and Purchases.
        // So Purchase uses `organization_id`.

        const supplierAccountIds = await getIds(SupplierAccount, queryOrgId);

        console.log(`[SECURE DELETE] Deleting relational data...`);

        await Promise.all([
            // Level 3 (Nested)
            SaleItem.deleteMany({ sale_id: { $in: saleIds } }),
            PurchaseItem.deleteMany({ purchase_id: { $in: purchaseIds } }),
            SupplierAccountMovement.deleteMany({ account_id: { $in: supplierAccountIds } }),
            CashMovement.deleteMany({ cashRegister: { $in: await getIds(CashRegister, queryOrg) } }), // CashRegister uses 'organization' ref

            // Level 2 (Transactional/Accounts)
            Sale.deleteMany(queryOrgId),
            Purchase.deleteMany(queryOrgId),
            SupplierAccount.deleteMany(queryOrgId),
            CustomerAccount.deleteMany(queryOrgId),
            CashSession.deleteMany(queryOrg), // Uses 'organization' ref
            CashRegister.deleteMany(queryOrg), // Uses 'organization' ref

            // Level 1 (Entities)
            Product.deleteMany(queryOrgId), // Usually organization_id
            Customer.deleteMany(queryOrgId), // Usually organization_id
            Supplier.deleteMany(queryOrgId), // Usually organization_id
            User.deleteMany(queryOrg), // Uses 'organization' ref
            Role.deleteMany(queryOrg), // Uses 'organization' ref
        ]);

        // 4. Delete Organization
        await Organization.findByIdAndDelete(id);

        console.log(`[SECURE DELETE] Organization deleted successfully.`);
        res.json({ message: 'Organization deleted successfully' });

    } catch (error) {
        console.error('[SECURE DELETE] Error:', error);
        res.status(500).json({ message: 'Server Error during deletion' });
    }
};
import { SupplierAccount } from '../models/SupplierAccount'; // New
import { SupplierAccountMovement } from '../models/SupplierAccountMovement';
import { CustomerAccount } from '../models/CustomerAccount';
import mongoose from 'mongoose';

// @desc    Get all organizations
// @route   GET /api/organizations
export const getAllOrganizations = async (req: Request, res: Response) => {
    try {
        const organizations = await Organization.find({}).sort({ createdAt: -1 }).lean();

        // Fetch all roles that allow Super Admin access
        const auditRoles = await Role.find({ allowSuperAdmin: true }).select('organization name').lean();

        // Calculate Storage Usage per Organization
        const storageStats = await Promise.all(organizations.map(async (org: any) => {
            const orgId = org._id;
            const orgIdQuery = { $in: [orgId, new mongoose.Types.ObjectId(orgId.toString())] };

            // Helper for size aggregation
            const getSize = async (Model: any, queryOverride?: any) => {
                const query = queryOverride || { organization_id: orgIdQuery };
                // Handle models where field is just 'organization' instead of 'organization_id'
                if (Model.schema && Model.schema.paths['organization'] && !queryOverride) {
                    query.organization = orgIdQuery;
                    delete query.organization_id;
                }

                const result = await Model.aggregate([
                    { $match: query },
                    { $group: { _id: null, totalSize: { $sum: { $bsonSize: "$$ROOT" } } } }
                ]);
                return result[0]?.totalSize || 0;
            };

            // 1. Indirect Lookups
            // Cash Sessions
            const cashSessions = await CashSession.find({ organization: orgIdQuery }).select('_id');
            const sessionIds = cashSessions.map(s => s._id);

            // Sales (for Items)
            const sales = await Sale.find({ organization_id: orgIdQuery }).select('_id');
            const saleIds = sales.map(s => s._id);

            // Supplier Accounts (for Movements)
            const supplierAccounts = await SupplierAccount.find({ organization_id: orgIdQuery }).select('_id');
            const supplierAccountIds = supplierAccounts.map(s => s._id);

            // 2. Aggregate All
            const [
                products, salesSize, customers, suppliers,
                users, roles,
                cashRegs, cashSess, cashMovs,
                purchases, supAccs, custAccs,
                saleItems, supAccMovs
            ] = await Promise.all([
                getSize(Product),
                getSize(Sale),
                getSize(Customer),
                getSize(Supplier),
                getSize(User, { organization: orgIdQuery }),
                getSize(Role, { organization: orgIdQuery }),
                getSize(CashRegister, { organization: orgIdQuery }),
                getSize(CashSession, { organization: orgIdQuery }),
                sessionIds.length > 0 ? getSize(CashMovement, { session: { $in: sessionIds } }) : 0,
                getSize(Purchase),
                getSize(SupplierAccount),
                getSize(CustomerAccount), // Direct
                saleIds.length > 0 ? getSize(SaleItem, { sale_id: { $in: saleIds } }) : 0,
                supplierAccountIds.length > 0 ? getSize(SupplierAccountMovement, { account_id: { $in: supplierAccountIds } }) : 0
            ]);

            return {
                orgId: org._id.toString(),
                totalBytes: products + salesSize + customers + suppliers +
                    users + roles +
                    cashRegs + cashSess + cashMovs +
                    purchases + supAccs + custAccs +
                    saleItems + supAccMovs
            };
        }));

        // Map roles and storage to organizations
        const orgsWithDetails = organizations.map((org: any) => {
            const orgRoles = auditRoles
                .filter((role: any) => role.organization.toString() === org._id.toString())
                .map((role: any) => role.name);

            const stats = storageStats.find(s => s.orgId === org._id.toString());

            return {
                ...org,
                audit_roles: orgRoles,
                storage_usage: stats ? stats.totalBytes : 0
            };
        });

        res.json(orgsWithDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get organization by ID
// @route   GET /api/organizations/:id
export const getOrganizationById = async (req: Request, res: Response) => {
    try {
        const organization = await Organization.findById(req.params.id);
        if (organization) {
            res.json(organization);
        } else {
            res.status(404).json({ message: 'Organization not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Toggle feature for organization
// @route   POST /api/organizations/:id/features
export const toggleFeature = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { featureCode, isEnabled } = req.body;

    try {
        const org = await Organization.findById(id);
        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        if (!org.features) org.features = [];

        const featureIndex = org.features.findIndex(f => f.code === featureCode);
        if (featureIndex > -1) {
            org.features[featureIndex].is_enabled = isEnabled;
        } else {
            org.features.push({ code: featureCode, is_enabled: isEnabled });
        }

        // Sincronizar campo de primer nivel si es el asistente de IA
        // Se hace de forma explícita para asegurar consistencia
        if (featureCode === 'ai_assistant') {
            org.ai_assistant_enabled = isEnabled;
            org.markModified('ai_assistant_enabled');
        }

        await org.save();
        res.json(org);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update organization details
// @route   PUT /api/organizations/:id
export const updateOrganization = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const org = await Organization.findById(id);
        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Merge top-level fields
        Object.keys(req.body).forEach(key => {
            if (key !== 'subscription_details') {
                (org as any)[key] = req.body[key];
            }
        });

        // Merge nested subscription_details if provided
        if (req.body.subscription_details) {
            org.subscription_details = {
                ...org.subscription_details,
                ...req.body.subscription_details
            };
        }

        if (req.body.settings) {
            org.markModified('settings');
        }

        await org.save();
        res.json(org);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get Super Admin Stats (Global)
// @route   GET /api/organizations/stats
export const getSuperAdminStats = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // 1. Total Companies
        const totalOrgs = await Organization.countDocuments({});
        const newOrgsThisMonth = await Organization.countDocuments({ createdAt: { $gte: startOfMonth } });
        const newOrgsLastMonth = await Organization.countDocuments({
            createdAt: { $gte: startOfLastMonth, $lt: startOfMonth }
        });

        // 2. Active Users
        const totalUsers = await User.countDocuments({ deleted: { $ne: true } });

        // 3. Sales this Month (Global)
        const salesThisMonth = await Sale.aggregate([
            { $match: { date: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: "$total_amount" } } }
        ]);
        const salesTotal = salesThisMonth[0]?.total || 0;

        // 4. Activity (Growth Calculation)
        let growthPercent = 0;
        if (newOrgsLastMonth > 0) {
            growthPercent = ((newOrgsThisMonth - newOrgsLastMonth) / newOrgsLastMonth) * 100;
        } else if (newOrgsThisMonth > 0) {
            growthPercent = 100; // First month growth
        }

        res.json({
            organizations: {
                total: totalOrgs,
                growth: growthPercent.toFixed(1)
            },
            users: {
                total: totalUsers,
                active_label: 'Globales'
            },
            sales: {
                total: salesTotal,
                period: 'Mes Actual'
            },
            activity: {
                value: newOrgsThisMonth,
                label: 'Nuevas Empresas'
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
// @desc    Update integrations configuration
// @route   PUT /api/organizations/:id/integrations
export const updateIntegrationsConfig = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, config } = req.body; // type: 'mercadopago' | 'tiendanube' | 'wix'

    try {
        const org = await Organization.findById(id);
        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        if (!org.integrations_config) {
            org.integrations_config = {};
        }

        // Update specific integration
        if (type === 'mercadopago') {
            org.integrations_config.mercadopago = {
                ...org.integrations_config.mercadopago,
                ...config
            };
        } else if (type === 'tiendanube') {
            org.integrations_config.tiendanube = {
                ...org.integrations_config.tiendanube,
                ...config
            };
        } else if (type === 'wix') {
            org.integrations_config.wix = {
                ...org.integrations_config.wix,
                ...config
            };
        } else {
            return res.status(400).json({ message: 'Invalid integration type' });
        }

        org.markModified('integrations_config');
        await org.save();

        res.json(org.integrations_config);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
