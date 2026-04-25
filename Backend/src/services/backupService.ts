import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import mongoose from 'mongoose';
import cron from 'node-cron';

// Models
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import { CashSession, CashMovement, CashRegister } from '../models/Cash';
import { Sale, SaleItem } from '../models/Sale'; // Updated
import { Organization } from '../models/Organization';
import { RestoreLog } from '../models/RestoreLog';
import { User } from '../models/User'; // New
import { Role } from '../models/Role'; // New
import { Purchase } from '../models/Purchase'; // New
import { PurchaseItem } from '../models/PurchaseItem'; // New
import { SupplierAccount } from '../models/SupplierAccount'; // New
import { SupplierAccountMovement } from '../models/SupplierAccountMovement'; // New
import { CustomerAccount } from '../models/CustomerAccount'; // New
import { Backup } from '../models/Backup';
import { Check } from '../models/Check';
import { Appointment } from '../models/Appointment';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const BACKUP_DIR = path.join(__dirname, '../../backups');

// Ensure backup dir exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export const createBackup = async (type: 'auto' | 'manual' | 'daily' = 'manual', label?: string, organizationId?: string, createdBy?: string, createdByRole?: string) => {
    try {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');

        const timeStr = `${day}-${month}-${year} ${hours}-${minutes}hs`;
        const friendlyType = type === 'manual' ? 'Manual' : (type === 'daily' ? 'Diario' : 'Auto');

        console.log(`[BackupService] Fetching data for backup (${friendlyType})...`);

        // Fetch Data Scoped by Organization
        let queryOrg: any = {};
        let queryOrgRef: any = {}; // For fields named 'organization'
        let cashMovementQuery: any = {};
        let orgQuery: any = {};

        // Indirect Queries
        let saleItemQuery: any = {};
        let purchaseItemQuery: any = {};
        let supAccMovementsQuery: any = {};

        let targetOrgId = organizationId;
        let organizationDoc: any = null;

        // Resolve Slug to ID if necessary
        if (organizationId) {
            const isObjectId = mongoose.Types.ObjectId.isValid(organizationId);
            if (!isObjectId) {
                organizationDoc = await Organization.findOne({ slug: organizationId }).lean();
                if (organizationDoc) {
                    targetOrgId = (organizationDoc as any)._id.toString();
                } else {
                    throw new Error(`Organization slug '${organizationId}' not found`);
                }
            } else {
                organizationDoc = await Organization.findById(organizationId).lean();
            }
        }

        // Check enabled features for the organization
        const enabledFeatures = organizationDoc?.features 
            ? organizationDoc.features.filter((f: any) => f.is_enabled).map((f: any) => f.code)
            : [];
        
        // Modules are often tied to tabs too
        const disabledTabs = organizationDoc?.settings?.disabled_tabs || [];
        const isModuleEnabled = (code: string, tabName?: string) => {
            if (tabName && disabledTabs.includes(tabName)) return false;
            return enabledFeatures.includes(code) || !enabledFeatures.length; // If no features defined, assume all for backward compatibility
        };

        const backupChecks = isModuleEnabled('checks', 'cheques');
        const backupAppointments = isModuleEnabled('appointments', 'turnero');

        if (targetOrgId) {
            const orgIdObj = new mongoose.Types.ObjectId(targetOrgId);
            queryOrg = { organization_id: orgIdObj };
            queryOrgRef = { organization: orgIdObj };
            orgQuery = { _id: orgIdObj };
            const registers = await CashRegister.find({ organization: orgIdObj }).distinct('_id');
            cashMovementQuery = { cashRegister: { $in: registers } };
        }

        const [saleIds, purchaseIds, supAccountIds] = await Promise.all([
            Sale.find(queryOrg).distinct('_id'),
            Purchase.find(queryOrg).distinct('_id'),
            SupplierAccount.find(queryOrg).distinct('_id')
        ]);

        if (targetOrgId) {
            saleItemQuery = { sale_id: { $in: saleIds } };
            purchaseItemQuery = { purchase_id: { $in: purchaseIds } };
            supAccMovementsQuery = { account_id: { $in: supAccountIds } };
        }

        // Fetch everything scoped by Org
        const [
            organizations,
            users,
            roles,
            products, customers, suppliers,
            cashRegisters, cashSessions, cashMovements,
            sales, saleItems,
            purchases, purchaseItems,
            supplierAccounts, supplierAccountMovements,
            customerAccounts
        ] = await Promise.all([
            Organization.find(orgQuery).lean(),
            User.find(queryOrgRef).lean(),
            Role.find(queryOrgRef).lean(),
            Product.find({ ...queryOrg, deleted: { $ne: true } }).lean(),
            Customer.find({ ...queryOrg, deleted: { $ne: true } }).lean(),
            Supplier.find({ ...queryOrg, deleted: { $ne: true } }).lean(),
            CashRegister.find(queryOrgRef).lean(),
            CashSession.find(queryOrgRef).lean(),
            CashMovement.find(cashMovementQuery).lean(),
            Sale.find(queryOrg).lean(),
            SaleItem.find(saleItemQuery).lean(),
            Purchase.find(queryOrg).lean(),
            PurchaseItem.find(purchaseItemQuery).lean(),
            SupplierAccount.find(queryOrg).lean(),
            SupplierAccountMovement.find(supAccMovementsQuery).lean(),
            CustomerAccount.find(queryOrg).lean()
        ]);

        console.log(`[BackupService] Base Data Retrieved. OrgID: ${organizationId}`);

        // 10. New Modules: Checks & Appointments
        let checks: any[] = [];
        let appointments: any[] = [];

        if (backupChecks) {
            console.log(`[BackupService] Backing up Checks...`);
            checks = await Check.find(queryOrgRef).lean();
        }
        if (backupAppointments) {
            console.log(`[BackupService] Backing up Appointments...`);
            appointments = await Appointment.find(queryOrg).lean();
        }

        const data = {
            organizations, users, roles,
            products, customers, suppliers,
            cashRegisters, cashSessions, cashMovements,
            sales, saleItems,
            purchases, purchaseItems,
            supplierAccounts, supplierAccountMovements,
            customerAccounts,
            checks,
            appointments
        };

        const itemCounts: any = {
            products: products.length,
            customers: customers.length,
            suppliers: suppliers.length,
            sales: sales.length,
            purchases: purchases.length,
            cashMovements: cashMovements.length,
            users: users.length
        };

        if (backupChecks) itemCounts.checks = checks.length;
        if (backupAppointments) itemCounts.appointments = appointments.length;

        // Construct Filename Dynamic
        let orgNamePart = '';
        if (organizationDoc) {
            const rawName = organizationDoc.slug || organizationDoc.name || 'Unknown';
            const cleanName = rawName.replace(/[<>:"/\\|?*]/g, '');
            orgNamePart = ` ${cleanName}`;
        }

        const filename = `Respaldo ${friendlyType}${orgNamePart} ${timeStr}.json.gz`;
        const filepath = path.join(BACKUP_DIR, filename);

        const backupPayload = {
            metadata: {
                timestamp: new Date(),
                version: '2.1',
                label,
                itemCounts,
                operator: createdBy,
                role: createdByRole
            },
            data
        };

        const jsonContent = JSON.stringify(backupPayload);
        const compressed = await gzip(jsonContent);
        await writeFile(filepath, compressed);

        // Save Metadata to DB
        if (targetOrgId) {
            await Backup.create({
                filename,
                label,
                type,
                organization: targetOrgId,
                size: compressed.length,
                status: 'success',
                itemCounts,
                createdBy,
                createdByRole
            });
        }

        console.log(`[BackupService] Backup created: ${filename} (${(compressed.length / 1024 / 1024).toFixed(2)} MB)`);

        await cleanOldBackups(30);

        return { success: true, filename, size: compressed.length };
    } catch (error: any) {
        console.error('[BackupService] Backup failed:', error);
        return { success: false, error: error.message };
    }
};

const cleanOldBackups = async (keepCount: number) => {
    try {
        const files = await readdir(BACKUP_DIR);
        const backups = await Promise.all(
            files.filter(f => f.endsWith('.json.gz'))
                .map(async f => ({
                    name: f,
                    path: path.join(BACKUP_DIR, f),
                    stats: await stat(path.join(BACKUP_DIR, f))
                }))
        );

        // Sort by Time (Newest First)
        backups.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

        if (backups.length > keepCount) {
            const toDelete = backups.slice(keepCount);
            for (const backup of toDelete) {
                fs.unlinkSync(backup.path);
                console.log(`[BackupService] Deleted old backup: ${backup.name}`);
            }
        }
    } catch (error) {
        console.error('[BackupService] Cleanup failed:', error);
    }
};

export const listBackups = async (organizationId?: string) => {
    try {
        let query: any = {};
        if (organizationId) {
            const org = await Organization.findOne({ slug: organizationId }).select('_id');
            if (org) query.organization = org._id;
        }

        const backups = await Backup.find(query).sort({ createdAt: -1 }).lean();
        
        return backups.map(b => ({
            _id: b._id,
            filename: b.filename,
            size: (b.size / 1024 / 1024).toFixed(2) + ' MB',
            date: b.createdAt,
            label: b.label,
            type: b.type,
            itemCounts: b.itemCounts,
            createdBy: b.createdBy,
            createdByRole: b.createdByRole
        }));
    } catch (error) {
        console.error('[BackupService] List backups failed:', error);
        return [];
    }
};

export const analyzeBackup = async (filePath: string) => {
    try {
        const fileContent = await readFile(filePath);
        const unzipped = await gunzip(fileContent);
        const backupData = JSON.parse(unzipped.toString('utf-8'));

        const { metadata, data } = backupData;
        
        const counts: any = {};
        if (data) {
            Object.keys(data).forEach(key => {
                counts[key] = Array.isArray(data[key]) ? data[key].length : (data[key] ? 1 : 0);
            });
        }

        return {
            success: true,
            metadata: metadata || {},
            counts
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};


export const listRestoreLogs = async (organizationId?: string) => {
    const query = organizationId ? { organization: organizationId } : {};
    return await RestoreLog.find(query, { details: 0 }) // Exclude heavy details from list
        .sort({ timestamp: -1 })
        .limit(50);
};

export const getRestoreLog = async (id: string) => {
    return await RestoreLog.findById(id);
};

export const getBackupPath = (filename: string) => {
    const safeName = path.basename(filename); // Prevent Directory Traversal
    return path.join(BACKUP_DIR, safeName);
};

// NOTE: We need to update restoreBackup too
export const restoreBackup = async (filePath: string, originalFilename?: string, organizationId?: string, collectionsToRestore?: string[]) => {
    try {
        console.log(`[BackupService] Restoring details from: ${filePath}...`);
        const filename = originalFilename || path.basename(filePath);

        const fileContent = await readFile(filePath);
        
        // SECURITY: Limit uncompressed size to prevent Zip Bombs (e.g., 100MB)
        // We can estimate uncompressed size or just rely on a safe limit during gunzip
        const unzipped = await gunzip(fileContent);
        if (unzipped.length > 100 * 1024 * 1024) {
            throw new Error('El archivo descomprimido es demasiado grande (Límite: 100MB).');
        }

        const jsonStr = unzipped.toString('utf-8');
        
        // SECURITY: Simple check for common prototype pollution patterns before parsing
        if (jsonStr.includes('"__proto__"') || jsonStr.includes('"constructor"')) {
            throw new Error('El archivo contiene patrones de datos no permitidos (Security Risk).');
        }

        const backupData = JSON.parse(jsonStr);

        const { data } = backupData;
        if (!data) throw new Error('Formato de respaldo inválido.');

        const smartProcess = async (Model: any, backupRecords: any[], type: string) => {
            if (!backupRecords || backupRecords.length === 0) return 0;
            
            // Check if this collection should be skipped
            const collectionName = Model.collection.collectionName.toLowerCase();
            const shouldRestore = !collectionsToRestore || 
                                collectionsToRestore.length === 0 || 
                                collectionsToRestore.some(c => c.toLowerCase() === type.toLowerCase() || c.toLowerCase() === collectionName);
            
            if (!shouldRestore) {
                console.log(`[BackupService] Skipping restoration for: ${type}`);
                return 0;
            }

            // SECURITY: Ensure we only update records belonging to THIS organization
            // Determine the field name used for organization scoping in this model
            const orgField = (Model.schema.paths.organization_id) ? 'organization_id' : 'organization';
            const isOrgModel = Model.modelName === 'Organization';

            const bulkOps = backupRecords.map(record => {
                // Remove sensitive fields that shouldn't be overwritten blindly
                const { _id, __v, ...cleanRecord } = record;
                
                // If it's the Organization record itself, we protect critical fields
                if (isOrgModel) {
                    delete (cleanRecord as any).subscription_status;
                    delete (cleanRecord as any).slug;
                    delete (cleanRecord as any).subscription_details;
                }

                // Force organization ID to the current context to prevent cross-org data injection
                if (organizationId && !isOrgModel) {
                    cleanRecord[orgField] = new mongoose.Types.ObjectId(organizationId);
                }

                // Filter construction: must match the ID AND the organization
                const filter: any = { _id: new mongoose.Types.ObjectId(_id) };
                if (!isOrgModel && organizationId) {
                    filter[orgField] = organizationId;
                }

                return {
                    updateOne: {
                        filter,
                        update: { $set: { ...cleanRecord, deleted: false, deletedAt: null } },
                        upsert: !isOrgModel // Only upsert if it's NOT the organization itself
                    }
                };
            });

            await Model.bulkWrite(bulkOps);
            return bulkOps.length;
        };

        const results: any = {};
        let totalChanges = 0;

        // Sequence of restoration
        if (data.organizations) totalChanges += await smartProcess(Organization, data.organizations, 'Organization');
        if (data.roles) totalChanges += await smartProcess(Role, data.roles, 'Role');
        if (data.users) totalChanges += await smartProcess(User, data.users, 'User');
        if (data.products) totalChanges += await smartProcess(Product, data.products, 'Product');
        if (data.customers) totalChanges += await smartProcess(Customer, data.customers, 'Customer');
        if (data.suppliers) totalChanges += await smartProcess(Supplier, data.suppliers, 'Supplier');
        if (data.cashRegisters) totalChanges += await smartProcess(CashRegister, data.cashRegisters, 'CashRegister');
        if (data.cashSessions) totalChanges += await smartProcess(CashSession, data.cashSessions, 'CashSession');
        if (data.cashMovements) totalChanges += await smartProcess(CashMovement, data.cashMovements, 'CashMovement');
        if (data.sales) totalChanges += await smartProcess(Sale, data.sales, 'Sale');
        if (data.saleItems) totalChanges += await smartProcess(SaleItem, data.saleItems, 'SaleItem');
        if (data.purchases) totalChanges += await smartProcess(Purchase, data.purchases, 'Purchase');
        if (data.purchaseItems) totalChanges += await smartProcess(PurchaseItem, data.purchaseItems, 'PurchaseItem');
        if (data.supplierAccounts) totalChanges += await smartProcess(SupplierAccount, data.supplierAccounts, 'SupplierAccount');
        if (data.supplierAccountMovements) totalChanges += await smartProcess(SupplierAccountMovement, data.supplierAccountMovements, 'SupplierAccountMovement');
        if (data.customerAccounts) totalChanges += await smartProcess(CustomerAccount, data.customerAccounts, 'CustomerAccount');
        if (data.checks) totalChanges += await smartProcess(Check, data.checks, 'Check');
        if (data.appointments) totalChanges += await smartProcess(Appointment, data.appointments, 'Appointment');

        results.totalChanges = totalChanges;
        const finalStatus = totalChanges > 0 ? 'RESTORED' : 'PROCESSED';

        // Log History
        try {
            await RestoreLog.create({
                timestamp: new Date(),
                organization: organizationId,
                backup_filename: filename,
                status: finalStatus,
                summary: {
                    total: totalChanges,
                    restoredCollections: collectionsToRestore || ['all']
                }
            });
        } catch (logError) {
            console.error('[BackupService] FAILED to create RestoreLog:', logError);
        }

        return { success: true, results };

    } catch (error: any) {
        console.error('[BackupService] Restore failed:', error);
        return { success: false, error: error.message };
    }
};

// Scheduler (Run Daily at 03:00 AM)
export const initBackupScheduler = () => {
    cron.schedule('0 6 * * *', async () => {
        console.log('[BackupService] Starting Daily Automatic Backups...');
        try {
            const organizations = await Organization.find({}).select('_id slug name');
            console.log(`[BackupService] Found ${organizations.length} organizations to backup.`);

            for (const org of organizations) {
                try {
                    await createBackup('daily', undefined, org._id.toString());
                    console.log(`[BackupService] Daily backup completed for: ${org.name} (${org.slug})`);
                } catch (err) {
                    console.error(`[BackupService] Failed to backup org: ${org.name}`, err);
                }
            }
        } catch (error) {
            console.error('[BackupService] Error fetching organizations for automatic backup:', error);
        }
    });
    console.log('[BackupService] Scheduler Initialized (Daily 03:00 AM) - Note: In serverless (Vercel), use the /trigger-daily endpoint via Vercel Crons.');
};

export const runDailyBackups = async () => {
    console.log('[BackupService] Starting Triggered Daily Automatic Backups...');
    const organizations = await Organization.find({}).select('_id slug name');
    const results = [];

    for (const org of organizations) {
        try {
            const res = await createBackup('daily', 'Auto-Triggered', org._id.toString(), 'Sistema');
            results.push({ org: org.slug, success: res.success });
        } catch (err: any) {
            console.error(`[BackupService] Failed to backup org: ${org.name}`, err);
            results.push({ org: org.slug, success: false, error: err.message });
        }
    }
    return results;
};
