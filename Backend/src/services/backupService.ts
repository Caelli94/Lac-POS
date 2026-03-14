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

export const createBackup = async (type: 'auto' | 'manual' | 'daily' = 'manual', label?: string, organizationId?: string) => {
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

        // Resolve Slug to ID if necessary
        if (organizationId) {
            const isObjectId = mongoose.Types.ObjectId.isValid(organizationId);
            if (!isObjectId) {
                const org = await Organization.findOne({ slug: organizationId }).lean();
                if (org) {
                    targetOrgId = (org as any)._id.toString();
                } else {
                    throw new Error(`Organization slug '${organizationId}' not found`);
                }
            }
        }

        if (targetOrgId) {
            // Standard 'organization_id' field
            queryOrg = { organization_id: targetOrgId };
            // 'organization' field (CashSession, User, Role, Register)
            queryOrgRef = { organization: targetOrgId };
            // Organization Collection itself
            orgQuery = { _id: targetOrgId };

            // CashMovements
            const registers = await CashRegister.find({ organization: targetOrgId }).distinct('_id');
            cashMovementQuery = { cashRegister: { $in: registers } };
        }

        // 1. Fetch Header IDs for Indirect Lookups
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

        // 2. Fetch All Data
        const [
            organizations,
            products, customers, suppliers,
            users, roles,
            cashRegisters, cashSessions, cashMovements,
            sales, saleItems,
            purchases, purchaseItems,
            supplierAccounts, supplierAccountMovements,
            customerAccounts
        ] = await Promise.all([
            Organization.find(orgQuery).lean(),
            Product.find({ ...queryOrg, deleted: { $ne: true } }).lean(),
            Customer.find({ ...queryOrg, deleted: { $ne: true } }).lean(),
            Supplier.find({ ...queryOrg, deleted: { $ne: true } }).lean(),
            User.find({ ...queryOrgRef }).lean(),
            Role.find({ ...queryOrgRef }).lean(),
            CashRegister.find({ ...queryOrgRef }).lean(),
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

        console.log(`[BackupService] Org Data Retrieved. OrgID: ${organizationId}`);

        // Construct Filename Dynamic
        let orgNamePart = '';
        if (organizationId && organizations.length > 0) {
            const org = organizations[0] as any;
            const rawName = org.slug || org.name || org.businessName || 'Unknown';
            const cleanName = rawName.replace(/[<>:"/\\|?*]/g, '');
            orgNamePart = ` ${cleanName}`;
        }

        const filename = `Respaldo ${friendlyType}${orgNamePart} ${timeStr}.json.gz`;
        const filepath = path.join(BACKUP_DIR, filename);

        const backupData = {
            metadata: {
                timestamp: new Date(),
                version: '2.0', // Version bump
                label
            },
            data: {
                organizations,
                users, roles,
                products, customers, suppliers,
                cashRegisters, cashSessions, cashMovements,
                sales, saleItems,
                purchases, purchaseItems,
                supplierAccounts, supplierAccountMovements,
                customerAccounts
            }
        };

        // Compress & Write
        const jsonContent = JSON.stringify(backupData);
        const compressed = await gzip(jsonContent);
        await writeFile(filepath, compressed);

        console.log(`[BackupService] Backup created: ${filename} (${(compressed.length / 1024 / 1024).toFixed(2)} MB)`);

        // Retention Policy
        await cleanOldBackups(30);

        return { success: true, filename, size: compressed.length };
    } catch (error) {
        console.error('[BackupService] Backup failed:', error);
        return { success: false, error };
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
        const files = await readdir(BACKUP_DIR);

        let filesToReturn = files.filter(f => f.endsWith('.json.gz'));

        // Security Filter: If Organization ID (Slug) is provided, only show backups containing that slug/name
        if (organizationId) {
            const searchTerm = organizationId.toLowerCase().trim();
            filesToReturn = filesToReturn.filter(f =>
                f.toLowerCase().includes(searchTerm)
            );
        }

        const backupList = await Promise.all(
            filesToReturn.map(async f => {
                const stats = await stat(path.join(BACKUP_DIR, f));
                return {
                    filename: f,
                    size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                    date: stats.mtime
                };
            })
        );
        return backupList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        return [];
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
export const restoreBackup = async (filePath: string, originalFilename?: string, organizationId?: string) => {
    try {
        console.log(`[BackupService] Restoring details from: ${filePath}...`);
        const filename = originalFilename || path.basename(filePath);

        const fileContent = await readFile(filePath);
        const unzipped = await gunzip(fileContent);
        const jsonStr = unzipped.toString('utf-8');
        const backupData = JSON.parse(jsonStr);

        const { data } = backupData;
        if (!data) throw new Error('Invalid Backup Format');

        const {
            organizations, users, roles,
            products, customers, suppliers,
            cashRegisters, cashSessions, cashMovements,
            sales, saleItems,
            purchases, purchaseItems,
            supplierAccounts, supplierAccountMovements,
            customerAccounts
        } = data;

        const logDetails: any = {
            products: [], customers: [], suppliers: []
        };

        const smartProcess = async (Model: any, backupRecords: any[], type: string) => {
            if (!backupRecords || backupRecords.length === 0) return 0;
            // Basic Restore Logic (Upsert)
            const bulkOps = backupRecords.map(record => ({
                updateOne: {
                    filter: { _id: record._id },
                    update: { $set: { ...record, deleted: false, deletedAt: null } },
                    upsert: true
                }
            }));
            await Model.bulkWrite(bulkOps);
            return bulkOps.length;
        };

        const results: any = {};
        let totalChanges = 0;

        // Restore Order matters? Not really for upsert by ID, but logical for deps.
        if (organizations) totalChanges += await smartProcess(Organization, organizations, 'Organization');
        if (roles) totalChanges += await smartProcess(Role, roles, 'Role');
        if (users) totalChanges += await smartProcess(User, users, 'User');

        if (products) totalChanges += await smartProcess(Product, products, 'Product');
        if (customers) totalChanges += await smartProcess(Customer, customers, 'Customer');
        if (suppliers) totalChanges += await smartProcess(Supplier, suppliers, 'Supplier');

        if (cashRegisters) totalChanges += await smartProcess(CashRegister, cashRegisters, 'CashRegister');
        if (cashSessions) totalChanges += await smartProcess(CashSession, cashSessions, 'CashSession');
        if (cashMovements) totalChanges += await smartProcess(CashMovement, cashMovements, 'CashMovement');

        if (sales) totalChanges += await smartProcess(Sale, sales, 'Sale');
        if (saleItems) totalChanges += await smartProcess(SaleItem, saleItems, 'SaleItem');

        if (purchases) totalChanges += await smartProcess(Purchase, purchases, 'Purchase');
        if (purchaseItems) totalChanges += await smartProcess(PurchaseItem, purchaseItems, 'PurchaseItem');

        if (supplierAccounts) totalChanges += await smartProcess(SupplierAccount, supplierAccounts, 'SupplierAccount');
        if (supplierAccountMovements) totalChanges += await smartProcess(SupplierAccountMovement, supplierAccountMovements, 'SupplierAccountMovement');

        if (customerAccounts) totalChanges += await smartProcess(CustomerAccount, customerAccounts, 'CustomerAccount');

        // Populate results for log
        results.products = products?.length || 0;
        results.sales = sales?.length || 0;
        results.others = totalChanges; // Simplified for now

        const finalStatus = totalChanges > 0 ? 'RESTORED' : 'PROCESSED';

        // Log History
        try {
            const logEntry = {
                timestamp: new Date(),
                organization: organizationId,
                backup_filename: filename,
                status: finalStatus,
                summary: {
                    products: results.products,
                    customers: customers?.length || 0,
                    suppliers: suppliers?.length || 0,
                    sales: results.sales,
                    others: (cashMovements?.length || 0) + (purchaseItems?.length || 0) // rough metric
                },
                details: logDetails // Detailed tracking requires the complex smartProcess logic from before, cutting for brevity/reliability
            };
            await RestoreLog.create(logEntry);
        } catch (logError) {
            console.error('[BackupService] FAILED to create RestoreLog:', logError);
        }

        console.log('[BackupService] Restore Completed.');
        return { success: true, results };

    } catch (error) {
        console.error('[BackupService] Restore failed:', error);
        return { success: false, error };
    }
};

// Scheduler (Run Daily at 03:00 AM)
export const initBackupScheduler = () => {
    cron.schedule('0 3 * * *', async () => {
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
    console.log('[BackupService] Scheduler Initialized (Daily 03:00 AM)');
};
