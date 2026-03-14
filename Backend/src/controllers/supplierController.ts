import { Request, Response } from 'express';
import { Supplier } from '../models/Supplier';
import { SupplierAccount } from '../models/SupplierAccount';
import { Purchase } from '../models/Purchase';
import mongoose from 'mongoose';
import { CashSession, CashMovement } from '../models/Cash';
import { SupplierAccountMovement } from '../models/SupplierAccountMovement';

// @desc    Get all suppliers for an organization
// @route   GET /api/suppliers/:orgId
export const getSuppliers = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const user = (req as any).user;
        const userOrgId = user.organization?._id?.toString() || user.organization?.toString() || '';

        // SECURITY: Strict Tenant Isolation (Exempt Super Admin)
        const isInternalMember = userOrgId && (userOrgId === orgId.toString());
        const isSystemAdmin = user.role === 'superadmin' || user.role === 'admin';

        if (!isInternalMember && !isSystemAdmin) {
            return res.status(403).json({ message: 'Acceso denegado.' });
        }

        // Pagination & Filters
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;
        const search = (req.query.search as string) || '';
        const debtFilter = (req.query.debtFilter as string) || 'all'; // all, debtor, non_debtor

        // Handle Mixed type: Check for both String and ObjectId
        const orgIdQuery = mongoose.isValidObjectId(orgId)
            ? { $in: [orgId, new mongoose.Types.ObjectId(orgId)] }
            : orgId;

        // 1. Base Match
        const matchStage: any = {
            organization_id: orgIdQuery,
            deleted: { $ne: true }
        };

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            matchStage.$or = [
                { name: searchRegex },
                { code: searchRegex },
                { tax_id: searchRegex },
                { email: searchRegex }
            ];
        }

        // 2. Aggregation Pipeline
        const pipeline: any[] = [
            { $match: matchStage },
            {
                $lookup: {
                    from: 'supplieraccounts',
                    localField: '_id',
                    foreignField: 'supplier_id',
                    as: 'account'
                }
            },
            { $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    has_active_account: { $ifNull: ['$account.is_active', false] },
                    credit_balance: { $ifNull: ['$account.balance', 0] },
                    credit_limit: { $ifNull: ['$account.credit_limit', 0] },
                    last_debt_date: '$account.last_debt_date',
                    id: '$_id'
                }
            }
        ];

        // 3. Debt Filter (Post-Lookup)
        if (debtFilter === 'debtor') {
            pipeline.push({ $match: { credit_balance: { $gt: 0 } } });
        } else if (debtFilter === 'non_debtor') {
            pipeline.push({ $match: { credit_balance: { $lte: 0 } } });
        }

        // Maturity Filter
        const maturityDays = parseInt(req.query.maturityDays as string);
        if (!isNaN(maturityDays) && maturityDays > 0) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - maturityDays);
            pipeline.push({
                $match: {
                    last_debt_date: { $lte: cutoffDate, $exists: true, $ne: null }
                }
            });
        }

        // 4. Facet for Pagination
        pipeline.push(
            { $sort: { name: 1 } },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $project: {
                                account: 0,
                                __v: 0
                            }
                        }
                    ]
                }
            }
        );

        const result = await Supplier.aggregate(pipeline);

        const data = result[0].data;
        const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
        const totalPages = Math.ceil(total / limit);

        res.json({
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        });

    } catch (error) {
        console.error("Error fetching suppliers:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ... (Create, Update, Delete Suppliers remains mostly same, but Create should init account)

// @desc    Create a new supplier
// @route   POST /api/suppliers
import { getNextSequenceValue, peekNextSequenceValue } from '../services/counterService';

import { Organization } from '../models/Organization';

// ... imports/exports

export const createSupplier = async (req: Request, res: Response) => {
    try {
        const { organization_id, name, tax_id, email, phone, address, contact_name, instagram, tiktok, web_url, image_url, addresses, phones, emails, is_active_account, category_ids, import_config } = req.body;

        // CHECK LIMITS
        const org = await Organization.findById(organization_id);
        const orgIdQuery = { $in: [new mongoose.Types.ObjectId(organization_id.toString()), organization_id.toString()] };

        if (org?.settings?.suppliers_limit !== undefined && org.settings.suppliers_limit !== -1) {
            const currentCount = await Supplier.countDocuments({ organization_id: orgIdQuery, deleted: { $ne: true } });
            if (currentCount >= org.settings.suppliers_limit) {
                return res.status(403).json({ message: 'LIMIT_REACHED_SUPPLIERS' });
            }
        }

        let code = req.body.code;
        if (!code) {
            const seq = await getNextSequenceValue(organization_id, 'supplier');
            code = `PROV-${seq}`;
        } else {
            const existing = await Supplier.findOne({ organization_id: orgIdQuery, code });
            if (existing) {
                const nextSeq = await peekNextSequenceValue(organization_id, 'supplier');
                return res.status(400).json({ message: `El código '${code}' ya existe. Sugerencia: PROV-${nextSeq}` });
            }
        }

        const supplier = await Supplier.create({
            organization_id,
            code,
            name,
            tax_id,
            email,
            phone,
            address,
            contact_name,
            instagram,
            tiktok,
            web_url,
            image_url,
            addresses,
            phones,
            emails,
            category_ids,
            import_config
        });

        // Initialize Account
        await SupplierAccount.create({
            organization_id,
            supplier_id: supplier._id,
            is_active: is_active_account || false,
            balance: 0,
            credit_limit: req.body.credit_limit || 0
        });

        res.status(201).json(supplier);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// ... (Update, Delete)

// @desc    Update a supplier
// @route   PUT /api/suppliers/:id
export const updateSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { code, name, tax_id, email, phone, address, contact_name, instagram, tiktok, web_url, image_url, addresses, phones, emails, is_active_account, credit_limit, category_ids, import_config } = req.body;

        // Uniqueness Check
        // Uniqueness Check
        if (code) {
            const currentSupplier = await Supplier.findById(id);
            if (!currentSupplier) return res.status(404).json({ message: 'Supplier not found' });

            // Ensure ID is comparable (ObjectId)
            const currentId = new mongoose.Types.ObjectId(id);

            const existing = await Supplier.findOne({
                organization_id: currentSupplier.organization_id,
                code,
                _id: { $ne: currentId }, // Explicit exclusion
                deleted: { $ne: true } // Ignore soft-deleted records
            });

            if (existing) {
                // Note: organization_id might be ObjectId or string, toString() handles safety
                const orgIdStr = currentSupplier.organization_id instanceof mongoose.Types.ObjectId
                    ? currentSupplier.organization_id.toString()
                    : currentSupplier.organization_id as string;

                const nextSeq = await peekNextSequenceValue(orgIdStr, 'supplier');
                return res.status(400).json({ message: `El código '${code}' ya existe. Sugerencia: PROV-${nextSeq}` });
            }
        }

        const supplier = await Supplier.findByIdAndUpdate(id, {
            code,
            name,
            tax_id,
            email,
            phone,
            address,
            contact_name,
            instagram,
            tiktok,
            web_url,
            image_url,
            addresses,
            phones,
            emails,
            category_ids,
            import_config
        }, { new: true });

        if (!supplier) {
            return res.status(404).json({ message: 'Supplier not found' });
        }

        // Update or Create Account Settings
        if (typeof is_active_account !== 'undefined' || typeof credit_limit !== 'undefined') {
            await SupplierAccount.findOneAndUpdate(
                { supplier_id: id },
                {
                    $set: {
                        is_active: is_active_account,
                        credit_limit: credit_limit || 0
                    },
                    $setOnInsert: {
                        organization_id: supplier.organization_id,
                        balance: 0
                    }
                },
                { upsert: true, new: true }
            );
        }

        res.json(supplier);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a supplier
// @route   DELETE /api/suppliers/:id
export const deleteSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await Supplier.findByIdAndUpdate(id, { deleted: true, deletedAt: new Date() });
        // Disable account (Soft Cascade)
        await SupplierAccount.findOneAndUpdate({ supplier_id: id }, { is_active: false });
        res.json({ message: 'Supplier deleted (soft)' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};


// --- ACCOUNT MANAGEMENT ---

// @desc    Get supplier account
// @route   GET /api/suppliers/:id/account
export const getSupplierAccount = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        let account = await SupplierAccount.findOne({ supplier_id: id });

        if (!account) {
            // Lazy creation
            const supplier = await Supplier.findOne({ _id: id, deleted: { $ne: true } });
            if (supplier) {
                account = await SupplierAccount.create({
                    organization_id: supplier.organization_id,
                    supplier_id: id,
                    is_active: true,
                    balance: 0
                });
            }
        }
        res.json(account);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}

// @desc    Update supplier account (active status)
// @route   PUT /api/suppliers/:id/account
export const updateSupplierAccount = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        let account = await SupplierAccount.findOne({ supplier_id: id });
        if (!account) {
            const supplier = await Supplier.findOne({ _id: id, deleted: { $ne: true } });
            if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
            account = await SupplierAccount.create({
                organization_id: supplier.organization_id,
                supplier_id: id,
                is_active: is_active,
                balance: 0
            });
        } else {
            account.is_active = is_active;
            await account.save();
        }

        res.json(account);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get account details with movements
// @route   GET /api/suppliers/:id/account/details
export const getAccountDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const account = await SupplierAccount.findOne({ supplier_id: id });

        if (!account) {
            return res.json({ hasAccount: false });
        }

        const movements = await SupplierAccountMovement.find({ account_id: account._id })
            .populate('performed_by', 'name role')
            .sort({ created_at: -1 });

        res.json({
            hasAccount: true,
            account,
            movements
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a movement (Transaction)
// @route   POST /api/suppliers/:id/account/movements
export const createAccountMovement = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { type, amount, discountAmount, description, addToCash, paymentMethod } = req.body; // type: 'DEBIT' | 'CREDIT'

        const account = await SupplierAccount.findOne({ supplier_id: id });
        if (!account) return res.status(404).json({ message: 'Account not found' });

        let session: any = null;
        if (addToCash) {
            session = await CashSession.findOne({
                organization: account.organization_id,
                status: 'open'
            });
            if (!session) {
                return res.status(400).json({ message: 'No hay ninguna caja abierta. Abra una caja para registrar movimientos de efectivo.' });
            }
        }

        // Calculate new balance
        // Calculate new balance
        const movementAmount = parseFloat(amount);

        if (type === 'DEBIT') {
            // Check Credit Limit (Only for New Debt)
            // Balance is Positive = Our Debt.
            const newBalance = account.balance + movementAmount;
            if (account.credit_limit > 0 && newBalance > account.credit_limit) {
                return res.status(400).json({
                    message: `La operación excede el límite de crédito del proveedor. Límite: $${account.credit_limit.toLocaleString('es-AR')}, Saldo resultante: $${newBalance.toLocaleString('es-AR')}`
                });
            }
            account.balance += movementAmount;
            account.last_debt_date = new Date(); // Reset countdown on new debt
        } else {
            const valAmount = parseFloat(amount) || 0;
            const valDiscount = parseFloat(discountAmount) || 0;
            const totalCredit = valAmount + valDiscount;

            account.balance -= totalCredit;
            if (account.balance <= 0) {
                account.last_debt_date = undefined;
            }
        }

        await account.save();

        const valAmount = parseFloat(amount) || 0;
        const valDiscount = parseFloat(discountAmount) || 0;
        const totalMovement = type === 'CREDIT' ? (valAmount + valDiscount) : movementAmount;

        let finalDescription = description || (type === 'CREDIT' ? 'Pago a Proveedor' : 'Factura / Deuda');
        if (type === 'CREDIT' && valAmount > 0 && valDiscount > 0) {
            finalDescription = `Pago ($${valAmount}) + Ajuste ($${valDiscount})${description ? `: ${description}` : ''}`;
        }

        const accountMovement = await SupplierAccountMovement.create({
            account_id: account._id,
            type,
            amount: totalMovement,
            description: finalDescription,
            performed_by: (req as any).user?._id
        });

        // Cash Integration
        if (addToCash && session) {
            // Mapping:
            // CREDIT (Payment to Supplier) -> Money OUT (EXPENSE)
            // DEBIT (Supplier gives money? Rare) -> Money IN (IN)

            // Logic: User is registering a PAYMENT to Supplier (CREDIT account). This takes money OUT of cash.
            // User is registering a DEBIT (e.g. Loan from supplier?). Usually not cash interactive in this direction for "Payment".
            // Standard Case: "Payment / Entrega" (CREDIT) -> Cash OUT.

            let cashType = 'EXPENSE'; // Default for paying supplier
            if (type === 'DEBIT') { // Increasing debt, receiving money?
                cashType = 'IN';
            }

            await CashMovement.create({
                cashRegister: session.cashRegister,
                session: session._id,
                type: cashType,
                amount: valAmount, // ONLY the cash amount goes to register
                description: `Pago a Prov.: ${finalDescription}`,
                paymentMethod: paymentMethod || 'Efectivo',
                referenceId: accountMovement._id.toString(),
                supplier: account.supplier_id,
                createdBy: (req as any).user?._id || session.openedBy
            });
        }

        res.json(accountMovement);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Void a movement
// @route   DELETE /api/suppliers/account/movements/:movementId
export const voidAccountMovement = async (req: Request, res: Response) => {
    try {
        const { movementId } = req.params;

        const movement = await SupplierAccountMovement.findById(movementId);
        if (!movement) {
            return res.status(404).json({ message: 'Movimiento no encontrado' });
        }

        if (movement.status === 'cancelled') {
            return res.status(400).json({ message: 'El movimiento ya está anulado' });
        }

        const account = await SupplierAccount.findById(movement.account_id);
        if (!account) return res.status(404).json({ message: 'Cuenta no encontrada' });

        // Reverse Balance
        // If it was DEBIT (Debt Increase), we Decrease Debt (Subtract)
        // If it was CREDIT (Payment/Debt Decrease), we Increase Debt (Add)
        if (movement.type === 'DEBIT') {
            account.balance -= movement.amount;
        } else {
            account.balance += movement.amount;
        }

        // Safety check for negative balance? Usually OK for advance payments, but let's clamp if desired or allow negative.
        // SupplierAccount usually: Positive = Debt. Negative = Credit in favor of us.
        // For now, simple math.

        // if (account.balance < 0) account.balance = 0; // Removed clamping

        await account.save();

        // Mark as cancelled
        movement.status = 'cancelled';
        await movement.save();

        // Void associated Cash Movement if it exists
        // We look for a CashMovement with referenceId matching this movement
        const cashMov = await CashMovement.findOne({ referenceId: movement._id.toString() });
        if (cashMov && cashMov.status !== 'cancelled') {
            // Revert Cash Session impact
            // Since balances are calculated via aggregation (getRegisterMovements),
            // we simply mark the movement as 'cancelled'. 
            // The aggregation logic filters out 'cancelled' movements.

            cashMov.status = 'cancelled';
            await cashMov.save();
        }

        res.json({ message: 'Movimiento anulado correctamente' });
    } catch (error) {
        console.error("Error voiding movement:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get supplier statistics (Total Debt, Top Suppliers)
// @route   GET /api/suppliers/:orgId/statistics
export const getSupplierStatistics = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const user = (req as any).user;
        const userOrgId = user.organization?._id?.toString() || user.organization?.toString() || '';

        // SECURITY: Strict Tenant Isolation (Exempt Super Admin)
        const isInternalMember = userOrgId && (userOrgId === orgId.toString());
        const isSystemAdmin = user.role === 'superadmin' || user.role === 'admin';

        if (!isInternalMember && !isSystemAdmin) {
            return res.status(403).json({ message: 'Acceso denegado.' });
        }
        const { from, to, limit } = req.query;
        const parsedLimit = limit ? parseInt(limit as string) : 5;
        const limitValue = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;

        // 1. Total Debt (Supplier Account Payables)
        const orgQuery = mongoose.isValidObjectId(orgId)
            ? { $in: [orgId, new mongoose.Types.ObjectId(orgId)] }
            : orgId;

        const debtAggregation = await SupplierAccount.aggregate([
            { $match: { organization_id: orgQuery, balance: { $gt: 0 } } },
            {
                $lookup: {
                    from: 'suppliers',
                    localField: 'supplier_id',
                    foreignField: '_id',
                    as: 'supplier'
                }
            },
            { $unwind: '$supplier' },
            { $match: { 'supplier.deleted': { $ne: true } } },
            { $group: { _id: null, total: { $sum: '$balance' } } }
        ]);
        const totalDebt = debtAggregation.length > 0 ? debtAggregation[0].total : 0;

        // 2. Top Suppliers (Purchases in Period)
        const matchStage: any = { organization_id: orgQuery };

        if (from && to) {
            const startDate = new Date(from as string);
            startDate.setUTCHours(3, 0, 0, 0);
            const endDate = new Date(to as string);
            endDate.setUTCHours(26, 59, 59, 999);
            matchStage.date = { $gte: startDate, $lte: endDate };
        }

        const topSuppliers = await Purchase.aggregate([
            { $match: matchStage },
            { $group: { _id: '$supplier_id', totalSpent: { $sum: '$total_amount' }, count: { $sum: 1 } } },
            { $match: { _id: { $ne: null } } },
            { $sort: { totalSpent: -1 } },
            { $limit: limitValue },
            {
                $lookup: {
                    from: 'suppliers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'supplier'
                }
            },
            { $unwind: '$supplier' },
            { $match: { 'supplier.deleted': { $ne: true } } },
            {
                $project: {
                    name: '$supplier.name',
                    totalSpent: 1,
                    count: 1
                }
            }
        ]);

        // 3. Supplier & Account Breakdown
        const totalSuppliers = await Supplier.countDocuments({ organization_id: orgQuery, deleted: { $ne: true } });

        const accountStats = await SupplierAccount.aggregate([
            { $match: { organization_id: orgQuery } },
            {
                $lookup: {
                    from: 'suppliers',
                    localField: 'supplier_id',
                    foreignField: '_id',
                    as: 'supplier'
                }
            },
            { $unwind: '$supplier' },
            { $match: { 'supplier.deleted': { $ne: true } } },
            {
                $group: {
                    _id: null,
                    totalAccounts: { $sum: 1 },
                    activeAccounts: { $sum: { $cond: [{ $eq: ['$is_active', true] }, 1, 0] } },
                    debtAccounts: { $sum: { $cond: [{ $gt: ['$balance', 0] }, 1, 0] } },
                    cleanAccounts: { $sum: { $cond: [{ $and: [{ $eq: ['$is_active', true] }, { $lte: ['$balance', 0] }] }, 1, 0] } }
                }
            }
        ]);

        const stats = accountStats[0] || { totalAccounts: 0, activeAccounts: 0, debtAccounts: 0, cleanAccounts: 0 };

        res.json({
            totalDebt,
            topSuppliers,
            breakdown: {
                totalSuppliers,
                totalAccounts: stats.totalAccounts,
                activeAccounts: stats.activeAccounts,
                debtAccounts: stats.debtAccounts,
                cleanAccounts: stats.cleanAccounts
            }
        });

    } catch (error) {
        console.error("Error fetching supplier stats:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};
