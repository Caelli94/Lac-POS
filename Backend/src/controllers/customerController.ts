import { Request, Response } from 'express';
import { Customer } from '../models/Customer';
import { CustomerAccount } from '../models/CustomerAccount';
import { AccountMovement } from '../models/AccountMovement';
import { CashSession, CashMovement, CashRegister } from '../models/Cash';
import { Sale } from '../models/Sale';
import mongoose from 'mongoose';
import { getNextSequenceValue, peekNextSequenceValue } from '../services/counterService';

// @desc    Get all customers for an organization
// @route   GET /api/customers/:orgId
// @desc    Get all customers for an organization
// @route   GET /api/customers/:orgId
// @desc    Get all customers for an organization
// @route   GET /api/customers/:orgId (OrgId ignored)
// Helper for robust organization ID comparison
const areOrgsEqual = (orgA: any, orgB: any): boolean => {
    if (!orgA || !orgB) return false;
    const idA = (orgA._id ? orgA._id.toString() : orgA.toString()).trim();
    const idB = (orgB._id ? orgB._id.toString() : orgB.toString()).trim();
    return idA === idB;
};

// @desc    Get all customers for an organization
// @desc    Get all customers for an organization (Paginated & Filtered)
export const getCustomers = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const user = (req as any).user;
        const userOrgId = user.organization?._id?.toString() || user.organization?.toString() || '';

        // SECURITY: Strict Tenant Isolation (Exempt Super Admin)
        const isInternalMember = userOrgId && userOrgId === orgId;
        const isSystemAdmin = user.role === 'superadmin' || user.role === 'admin';

        if (!isInternalMember && !isSystemAdmin) {
            return res.status(403).json({ message: 'Acceso denegado: No tienes permiso para ver datos de esta organización.' });
        }

        // Pagination & Filters
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;
        const search = (req.query.search as string) || '';
        const debtFilter = (req.query.debtFilter as string) || 'all'; // all, debtor, non_debtor

        // 1. Base Match (Customer Fields)
        const matchStage: any = {
            organization_id: { $in: [new mongoose.Types.ObjectId(orgId), orgId] },
            deleted: { $ne: true }
        };

        if (search) {
            const searchRegex = { $regex: search, $options: 'i' };
            matchStage.$or = [
                { name: searchRegex },
                { code: searchRegex },
                { doc_number: searchRegex },
                { email: searchRegex }
            ];
        }

        // 2. Lookup & Account Info
        const pipeline: any[] = [
            { $match: matchStage },
            {
                $lookup: {
                    from: 'customeraccounts',
                    localField: '_id',
                    foreignField: 'customer_id',
                    as: 'account'
                }
            },
            {
                $unwind: {
                    path: '$account',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    has_active_account: { $ifNull: ['$account.is_active', false] },
                    credit_balance: { $ifNull: ['$account.balance', 0] },
                    credit_limit: { $ifNull: ['$account.credit_limit', 0] },
                    last_debt_date: '$account.last_debt_date',
                    id: '$_id' // Mapping _id to id
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
            // Ensure we filter valid dates
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

        const result = await Customer.aggregate(pipeline);

        const data = result[0].data;
        const total = result[0].metadata[0]?.total || 0;

        res.json({
            data,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get customer by ID
// @route   GET /api/customers/detail/:id
export const getCustomerById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const customer = await Customer.findById(id);
        if (!customer || customer.deleted) return res.status(404).json({ message: 'Customer not found' });

        // SECURITY: Access Bypass
        if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, customer.organization_id)) {
            return res.status(403).json({ message: 'Acceso Denegado' });
        }

        res.json(customer);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new customer
// @route   POST /api/customers


import { Organization } from '../models/Organization';

// ...

export const createCustomer = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const organization_id = user.organization._id || user.organization; // STRICT

        // CHECK LIMITS
        const org = await Organization.findById(organization_id);
        const orgIdQuery = { $in: [new mongoose.Types.ObjectId(organization_id.toString()), organization_id.toString()] };

        if (org?.settings?.customers_limit !== undefined && org.settings.customers_limit !== -1) {
            const currentCount = await Customer.countDocuments({ organization_id: orgIdQuery, deleted: { $ne: true } });
            if (currentCount >= org.settings.customers_limit) {
                return res.status(403).json({ message: 'LIMIT_REACHED_CUSTOMERS' });
            }
        }

        const { name, doc_type, doc_number, phone, email, address, city, province, is_active, credit_limit, image_url } = req.body;

        let code = req.body.code;
        if (!code) {
            const seq = await getNextSequenceValue(organization_id, 'customer');
            code = `CLI-${seq}`;
        } else {
            // Check for duplicate IN THIS ORG
            const existing = await Customer.findOne({ organization_id: orgIdQuery, code });
            if (existing) {
                const nextSeq = await peekNextSequenceValue(organization_id, 'customer');
                return res.status(400).json({ message: `El código '${code}' ya existe. Sugerencia: CLI-${nextSeq}` });
            }
        }

        const customer = await Customer.create({
            organization_id,
            code,
            name,
            doc_type,
            doc_number,
            phone,
            email,
            address,
            city,
            province,
            image_url
        });

        // Initialize Account
        await CustomerAccount.create({
            organization_id,
            customer_id: customer._id,
            is_active: is_active || false, // Default to false if not provided
            credit_limit: credit_limit || 0
        });

        res.status(201).json(customer);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
export const updateCustomer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const userOrgId = user.organization._id ? user.organization._id.toString() : user.organization.toString();

        // 1. Find Customer Unscoped
        const customer = await Customer.findById(id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        // 2. Security Check
        const customerOrgId = customer.organization_id.toString();
        if (user.role !== 'superadmin' && userOrgId !== customerOrgId) {
            return res.status(403).json({ message: 'Acceso Denegado' });
        }

        // 3. Uniqueness Check for Code (Scoped to Customer's Org)
        if (req.body.code) {
            // Ensure ID is comparable (ObjectId)
            const currentId = new mongoose.Types.ObjectId(id);

            const existing = await Customer.findOne({
                organization_id: customer.organization_id, // Use resource's org
                code: req.body.code,
                _id: { $ne: currentId }, // Explicit exclusion
                deleted: { $ne: true } // Ignore soft-deleted records
            });

            if (existing) {
                // Double check to ensure we didn't accidentally match the same doc due to some obscure reason
                if (existing._id.toString() === id) {
                    // Should be impossible with $ne, but safety net
                } else {
                    const nextSeq = await peekNextSequenceValue(customer.organization_id.toString(), 'customer');
                    return res.status(400).json({ message: `El código '${req.body.code}' ya existe. Sugerencia: CLI-${nextSeq}` });
                }
            }
        }

        // 4. Update
        Object.assign(customer, req.body);
        await customer.save();

        res.json(customer);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
export const deleteCustomer = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const userOrgId = user.organization._id ? user.organization._id.toString() : user.organization.toString();

        // 1. Find Customer Unscoped
        const customer = await Customer.findById(id);
        if (!customer) return res.status(404).json({ message: 'Customer not found' });

        // 2. Security Check
        const customerOrgId = customer.organization_id.toString();
        if (user.role !== 'superadmin' && userOrgId !== customerOrgId) {
            return res.status(403).json({ message: 'Acceso Denegado' });
        }

        // 3. Soft Delete
        customer.deleted = true;
        customer.deletedAt = new Date();
        await customer.save();

        // 4. Disable account
        await CustomerAccount.findOneAndUpdate({ customer_id: id }, { is_active: false });

        res.json({ message: 'Customer deleted (soft)' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get customer account (Checking Account)
// @route   GET /api/customers/:id/account
export const getCustomerAccount = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // Customer ID
        const user = (req as any).user;

        // 1. Try Find Account regardless of org (to support Super Admin)
        // Ensure robust casting for the search
        const customerIdObj = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
        let account = await CustomerAccount.findOne({ customer_id: customerIdObj });

        if (account) {
            // SECURITY CHECK
            if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, account.organization_id)) {
                return res.status(403).json({ message: 'Acceso Denegado' });
            }
        } else {
            // Lazy creation if missing
            // 2. Find Customer to verify existence and get Org ID
            const customer = await Customer.findById(id);

            if (!customer) {
                return res.status(404).json({ message: 'Customer not found' });
            }

            // SECURITY CHECK (Before Creation)
            if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, customer.organization_id)) {
                return res.status(403).json({ message: 'Acceso Denegado' });
            }

            // Create Account using CUSTOMER'S Organization ID
            account = await CustomerAccount.create({
                organization_id: customer.organization_id, // Use Customer's Org
                customer_id: id,
                is_active: true,
                credit_limit: 0
            });
        }

        res.json(account);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
}

// @desc    Update customer account details (limit, status)
// @route   PUT /api/customers/:id/account
export const updateCustomerAccount = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const { is_active, credit_limit } = req.body;

        // 1. Try Find Account
        const customerIdObj = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
        let account = await CustomerAccount.findOne({ customer_id: customerIdObj });

        if (account) {
            // SECURITY CHECK
            if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, account.organization_id)) {
                return res.status(403).json({ message: 'Acceso Denegado' });
            }

            account.is_active = is_active;
            account.credit_limit = credit_limit;
            await account.save();

        } else {
            // 2. Find Customer (for Creation)
            const customer = await Customer.findById(id);
            if (!customer) return res.status(404).json({ message: 'Customer not found' });

            // SECURITY CHECK
            if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, customer.organization_id)) {
                return res.status(403).json({ message: 'Acceso Denegado' });
            }

            account = await CustomerAccount.create({
                organization_id: customer.organization_id, // Use Customer's Org
                customer_id: id,
                is_active,
                credit_limit
            });
        }

        res.json(account);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get account details with movements
// @route   GET /api/customers/:id/account/details
export const getAccountDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        // Find Account regardless of org first (Robust Casting)
        const customerIdObj = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
        const account = await CustomerAccount.findOne({ customer_id: customerIdObj });

        if (!account) {
            return res.json({ hasAccount: false });
        }

        // SECURITY CHECK
        if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, account.organization_id)) {
            return res.status(403).json({ message: 'Acceso Denegado' });
        }

        const movements = await AccountMovement.find({ account_id: account._id })
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
// @route   POST /api/customers/:id/account/movements
export const createAccountMovement = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const organization_id = user.organization._id || user.organization;

        const { type, amount, discountAmount, description, addToCash, paymentMethod } = req.body; // type: 'DEBIT' | 'CREDIT'

        // 1. Find Account Unscoped (Robust Casting)
        const customerIdObj = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
        const account = await CustomerAccount.findOne({ customer_id: customerIdObj });
        if (!account) return res.status(404).json({ message: 'Account not found' });

        // 2. Security Check (Super Admin Bypass)
        if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, account.organization_id)) {
            return res.status(403).json({ message: 'Acceso Denegado' });
        }

        const targetOrgId = account.organization_id; // Use Account's Org for Cash Session lookup

        let session: any = null;
        if (addToCash) {
            session = await CashSession.findOne({
                organization: targetOrgId, // SCOPED to Account's Org
                status: 'open'
            });
            if (!session) {
                return res.status(400).json({ message: 'No hay ninguna caja abierta. Abra una caja para registrar pagos en efectivo.' });
            }
        }

        // Calculate new balance
        const movementAmount = parseFloat(amount);
        if (type === 'DEBIT') {
            // Check Credit Limit (Only for New Debt)
            const newBalance = account.balance + movementAmount;
            if (account.credit_limit > 0 && newBalance > account.credit_limit) {
                return res.status(400).json({
                    message: `La operación excede el límite de crédito del cliente. Límite: $${account.credit_limit.toLocaleString('es-AR')}, Saldo resultante: $${newBalance.toLocaleString('es-AR')}`
                });
            }
            account.balance += movementAmount; // Increases debt
            account.last_debt_date = new Date(); // Reset countdown on new purchase
        } else {
            // Decreases debt (Can be Amount + Discount)
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
        const totalMovement = type === 'CREDIT' ? (valAmount + valDiscount) : valAmount;

        let finalDescription = description || (type === 'CREDIT' ? 'Pago / Entrega' : 'Recargo / Mora');
        if (type === 'CREDIT' && valAmount > 0 && valDiscount > 0) {
            finalDescription = `Pago ($${valAmount}) + Ajuste ($${valDiscount})${description ? `: ${description}` : ''}`;
        }

        const accountMovement = await AccountMovement.create({
            account_id: account._id,
            type,
            amount: totalMovement,
            description: finalDescription,
            performed_by: user._id
        });

        // Cash Integration
        if (addToCash && session) {
            // Map Account movement to Cash movement
            // CREDIT to Account (Pays off debt) = Money IN to Cash (PAYMENT_RECEIVED)
            // DEBIT to Account (Increases debt) = Money OUT of Cash (WITHDRAWAL)

            const cashType = type === 'CREDIT' ? 'IN' : 'OUT';

            await CashMovement.create({
                cashRegister: session.cashRegister,
                session: session._id,
                type: cashType,
                amount: valAmount, // ONLY the cash amount goes to register
                description: `Cta. Cte.: ${finalDescription}`,
                paymentMethod: paymentMethod || 'Efectivo',
                referenceId: accountMovement._id.toString(),
                customer: account.customer_id,
                createdBy: user._id
            });
        }

        res.json(accountMovement);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Void an account movement
// @route   DELETE /api/customers/account/movements/:movementId
export const voidAccountMovement = async (req: Request, res: Response) => {
    const sessionTransaction = await mongoose.startSession();
    sessionTransaction.startTransaction();

    try {
        const { movementId } = req.params;
        const user = (req as any).user;

        // 1. Find Movement and its account
        const movement = await AccountMovement.findById(movementId).populate('account_id');
        if (!movement) return res.status(404).json({ message: 'Movement not found' });
        if (movement.status === 'cancelled') return res.status(400).json({ message: 'Movement already cancelled' });

        const account = movement.account_id as any; // Populated CustomerAccount

        // 2. Security Check
        if (user.role !== 'superadmin' && !areOrgsEqual(user.organization, account.organization_id)) {
            return res.status(403).json({ message: 'Acceso Denegado' });
        }

        // 3. Mark Movement as Cancelled
        movement.status = 'cancelled';
        await movement.save({ session: sessionTransaction });

        // 4. Revert Account Balance
        // If it was DEBIT (Debt Increased) -> SUBTRACT to revert
        // If it was CREDIT (Debt Decreased) -> ADD to revert
        if (movement.type === 'DEBIT') {
            account.balance -= movement.amount;
        } else {
            account.balance += movement.amount;
        }

        // if (account.balance < 0) account.balance = 0;
        await account.save({ session: sessionTransaction });

        // 5. Revert Linked Cash Movement (if any)
        // Manual account movements created via createAccountMovement have a CashMovement where referenceId = accountMovement._id
        const cashMovement = await CashMovement.findOne({ referenceId: movement._id.toString(), status: { $ne: 'cancelled' } }).session(sessionTransaction);

        if (cashMovement) {
            cashMovement.status = 'cancelled';
            await cashMovement.save({ session: sessionTransaction });

            // Revert Cash Register Balance if it was cash
            if (cashMovement.paymentMethod === 'cash' || cashMovement.paymentMethod === 'Efectivo') {
                let adjustment = 0;
                // If it was IN (sale/payment) -> It added money -> SUBTRACT
                if (cashMovement.type === 'IN' || cashMovement.type === 'SALE' || cashMovement.type === 'PAYMENT_RECEIVED') {
                    adjustment = -Number(cashMovement.amount);
                } else if (cashMovement.type === 'OUT' || cashMovement.type === 'EXPENSE' || cashMovement.type === 'WITHDRAWAL') {
                    adjustment = Number(cashMovement.amount);
                }

                await CashRegister.findByIdAndUpdate(cashMovement.cashRegister, {
                    $inc: { closingBalance: adjustment }
                }).session(sessionTransaction);
            }
        }

        await sessionTransaction.commitTransaction();
        sessionTransaction.endSession();

        res.json({ success: true, message: 'Movimiento anulado correctamente' });

    } catch (error: any) {
        await sessionTransaction.abortTransaction();
        sessionTransaction.endSession();
        console.error("Error voiding account movement:", error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};
// @desc    Get customer statistics (Total Debt, Top Spenders)
// @route   GET /api/customers/:orgId/statistics (OrgId ignored)
export const getCustomerStatistics = async (req: Request, res: Response) => {
    try {
        const { orgId } = req.params;
        const user = (req as any).user;
        const userOrgId = user.organization?._id?.toString() || user.organization?.toString() || '';

        const isInternalMember = userOrgId && userOrgId === orgId;
        const isSystemAdmin = user.role === 'superadmin' || user.role === 'admin';

        if (!isInternalMember && !isSystemAdmin) {
            return res.status(403).json({ message: 'Acceso denegado.' });
        }

        const { from, to, limit } = req.query;

        const parsedLimit = limit ? parseInt(limit as string) : 5;
        const limitValue = !isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 5;

        // 1. Total Debt (Current Account Receivables)
        const debtAggregation = await CustomerAccount.aggregate([
            {
                $match: {
                    organization_id: { $in: [new mongoose.Types.ObjectId(orgId), orgId] },
                    balance: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: '$customer_id',
                    balance: { $first: '$balance' }
                }
            },
            {
                $lookup: {
                    from: 'customers',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: '$customer' },
            { $match: { 'customer.deleted': { $ne: true } } },
            { $group: { _id: null, total: { $sum: '$balance' } } }
        ]);
        const totalDebt = debtAggregation.length > 0 ? debtAggregation[0].total : 0;

        // 2. Top 5 Spenders (Sales in Period)
        const matchStage: any = {
            organization_id: { $in: [new mongoose.Types.ObjectId(orgId), orgId] } // Robust Match
        };

        if (from && to) {
            const startDate = new Date(from as string);
            startDate.setUTCHours(3, 0, 0, 0);

            const endDate = new Date(to as string);
            endDate.setUTCHours(26, 59, 59, 999);

            matchStage.date = { $gte: startDate, $lte: endDate };
        }

        const topSpenders = await Sale.aggregate([
            { $match: matchStage },
            { $group: { _id: '$customer_id', totalSpent: { $sum: '$total_amount' }, count: { $sum: 1 } } },
            { $match: { _id: { $ne: null } } },
            { $sort: { totalSpent: -1 } },
            { $limit: limitValue },
            {
                $addFields: {
                    customerIdObj: { $toObjectId: "$_id" }
                }
            },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customerIdObj',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: '$customer' },
            { $match: { 'customer.deleted': { $ne: true } } },
            {
                $project: {
                    name: '$customer.name',
                    totalSpent: 1,
                    count: 1
                }
            }
        ]);

        // 3. Customer & Account Breakdown
        const orgFilter = { organization_id: { $in: [new mongoose.Types.ObjectId(orgId), orgId] } };

        const totalCustomers = await Customer.countDocuments({ ...orgFilter, deleted: { $ne: true } });

        // Aggregate accounts to exclude those belonging to deleted customers
        const accountStats = await CustomerAccount.aggregate([
            { $match: orgFilter },
            {
                $lookup: {
                    from: 'customers',
                    localField: 'customer_id',
                    foreignField: '_id',
                    as: 'customer'
                }
            },
            { $unwind: '$customer' },
            { $match: { 'customer.deleted': { $ne: true } } },
            {
                $group: {
                    _id: '$customer_id',
                    is_active: { $first: '$is_active' },
                    balance: { $first: '$balance' }
                }
            },
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
            topSpenders,
            breakdown: {
                totalCustomers,
                totalAccounts: stats.totalAccounts,
                activeAccounts: stats.activeAccounts,
                debtAccounts: stats.debtAccounts,
                cleanAccounts: stats.cleanAccounts
            }
        });

    } catch (error) {
        console.error("Error fetching customer stats:", error);
        res.status(500).json({ message: 'Server Error' });
    }
};
